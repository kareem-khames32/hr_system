// سجل موديولات النظام (خطة التنفيذ — الجزء 3، الدفعة B0.2): المصدر الواحد لـ«إيه الموديولات الموجودة، مين أساسي مايتقفلش،
// مين بيعتمد على مين، المزايا الفرعية، الباقات، ومسارات الواجهة وأنواع الطلبات والمهام المجدولة التابعة لكل موديول».
//
// ملف بيانات صافي من غير أي import: الواجهة بتستورده زي ما هو (src/lib/modules.ts) فالقاعدة واحدة في الخادم والشاشة.
// حالة التفعيل نفسها في القاعدة (system_modules وsystem_module_features — ترحيل 076)؛ الصف الغايب = القيمة الافتراضية هنا.
// كل موديول جديد لازم يتسجّل هنا قبل ما يتبني له endpoint أو شاشة (اختبار B0.5 بيفشل من غير كده).

export type ModulePreset = 'basic' | 'standard' | 'full'

export const MODULE_PRESETS: Record<ModulePreset, { nameAr: string; description: string }> = {
  basic: { nameAr: 'الأساسية', description: 'شؤون موظفين وحضور وإجازات ورواتب وسلف وعهد وإنهاء خدمة' },
  standard: { nameAr: 'القياسية', description: 'الأساسية + التوظيف والأداء والتدريب وخدمات الموارد البشرية' },
  full: { nameAr: 'الكاملة', description: 'القياسية + الموديولات المتقدمة للشركات الكبيرة' },
}
// ترتيب الباقات: كل باقة بتشمل اللي قبلها
export const MODULE_PRESET_ORDER: ModulePreset[] = ['basic', 'standard', 'full']

export type ModuleGroup = 'core' | 'time' | 'money' | 'people' | 'talent'

export const MODULE_GROUPS: Record<ModuleGroup, string> = {
  core: 'الأساس',
  time: 'الوقت والحضور',
  money: 'الرواتب والفلوس',
  people: 'دورة الموظف',
  talent: 'التوظيف والمواهب',
}

export interface ModuleFeatureDef {
  nameAr: string
  description: string
  /** القيمة لما مفيش صف في القاعدة */
  default: boolean
  /** مسارات واجهة تابعة للميزة نفسها: بتتقفل مع الميزة حتى لو موديولها مفعّل (B5.3) */
  routes?: string[]
}

export interface ModuleDef {
  nameAr: string
  description: string
  group: ModuleGroup
  /** أساسي = مايتقفلش */
  core: boolean
  /** لازم يبقوا مفعّلين عشان الموديول ده يتفعّل */
  dependsOn: string[]
  /** بيستخدمهم لو مفعّلين، ومابيقعش لو مقفولين */
  softUses: string[]
  /** أقل باقة فيها الموديول (والباقات الأعلى بتشمله). null = برّه الباقات (بيتفعّل لوحده) */
  preset: ModulePreset | null
  /** الحالة لما مفيش صف في القاعدة: الموجود قبل نظام الموديولات = true عشان مفيش حاجة شغالة تتقفل لوحدها */
  defaultEnabled: boolean
  features: Record<string, ModuleFeatureDef>
  /** مفاتيح الصلاحيات التابعة للموديول (شاشة الأدوار بتعرض صلاحيات الموديولات المفعّلة بس) */
  permissions: string[]
  /** بادئات مسارات الواجهة التابعة للموديول (القايمة وحارس المسارات) */
  routes: string[]
  /** أكواد أنواع الطلبات التابعة للموديول بالاسم */
  requestTypes: string[]
  /** معالجات التنفيذ التابعة للموديول: أي نوع طلب (حتى المخصص) معالجه من دول بيتبع الموديول */
  requestHandlers: string[]
  /** أسماء المهام المجدولة التابعة للموديول */
  jobs: string[]
}

const moduleDef = (def: Partial<ModuleDef> & Pick<ModuleDef, 'nameAr' | 'description' | 'group'>): ModuleDef => ({
  core: false, dependsOn: [], softUses: [], preset: 'basic', defaultEnabled: true, features: {}, permissions: [], routes: [],
  requestTypes: [], requestHandlers: [], jobs: [], ...def,
})

export const MODULES = {
  // ===== الأساس (مايتقفلش) =====
  platform: moduleDef({
    nameAr: 'المنصة والإعدادات', group: 'core', core: true,
    description: 'الدخول والحسابات والأدوار والإعدادات العامة ولوحة التحكم، وتقويم الشركة (أيام العمل والعطلات الرسمية)',
    permissions: ['users.manage', 'roles.manage', 'settings.manage', 'settings.modules', 'dashboard.view_all', 'audit.view'],
    // أيام العمل والعطلات الرسمية أساسي: الحضور والإجازات والرواتب كلهم بيحسبوا منهم، فمايتقفلوش مع موديول واحد
    routes: ['/', '/settings', '/login', '/leaves/holidays'],
    features: {
      'platform.demo_screens': {
        nameAr: 'شاشات العرض التجريبية',
        description: 'روابط شاشات العرض القديمة (إضافة وظيفة، صفحة الوظيفة، تقييم جديد، تقارير مخصصة): الشاشات نفسها اتشالت وكل رابط بيحوّل لشاشته الحقيقية. كانت: شاشات ببيانات عرض ثابتة من غير خلفية: الأداء، والتدريب، والوظائف والمقابلات والعروض، والتقارير المخصصة. بتتقفل لحد ما الموديول الحقيقي ينزل.',
        default: false,
      },
    },
  }),
  org: moduleDef({
    nameAr: 'الهيكل التنظيمي', group: 'core', core: true,
    description: 'الفروع والإدارات والأقسام والفرق والهيكل المرئي',
    permissions: ['org.manage'],
    routes: ['/settings/branches', '/settings/departments', '/settings/teams', '/settings/cost-centers', '/employees/org-chart'],
  }),
  employees: moduleDef({
    nameAr: 'الموظفين والملف والعقود والحركة', group: 'core', core: true, dependsOn: ['org'],
    description: 'ملف الموظف وبياناته وعقوده ونقله وترقيته وإيقافه وأرشفته',
    permissions: ['employees.view', 'employees.create', 'employees.edit', 'employees.archive', 'transfers.view', 'employees.view_compensation'],
    routes: ['/employees', '/settings/job-titles', '/settings/grades', '/settings/employee-fields'],
    requestHandlers: ['employee_update_promotions', 'transfers_effective_date', 'employee_update', 'contracts_register', 'employee_record', 'employee_record_auto'],
    jobs: ['requests.scheduled-transfers'],
  }),
  self_service: moduleDef({
    nameAr: 'بوابة الموظف', group: 'core', core: true, dependsOn: ['employees'],
    description: 'لوحتي وملفي الشخصي والتقويم',
    permissions: ['calendar.view_all'],
    routes: ['/profile', '/calendar', '/my'],
  }),
  requests: moduleDef({
    nameAr: 'محرك الطلبات والاعتمادات', group: 'core', core: true, dependsOn: ['employees'],
    description: 'أنواع الطلبات وسلاسل الاعتماد وصندوق الموافقات',
    permissions: ['requests.view_all', 'requests.create_on_behalf', 'approve.hr', 'approve.finance', 'approve.it', 'approve.payroll', 'approve.executive',
      'request_types.manage', 'approval_chains.manage'],
    routes: ['/requests', '/approvals-inbox', '/requests-console', '/settings/request-types', '/settings/approvals'],
    jobs: ['requests.escalations'],
  }),
  notifications: moduleDef({
    nameAr: 'الإشعارات', group: 'core', core: true,
    description: 'إشعارات النظام داخل التطبيق وبالبريد',
    routes: ['/notifications'],
    // B2.4: الملخص اليومي للبريد
    jobs: ['notifications.daily-digest'],
  }),
  // B2.5: المهمة العامة و«مهامي» (فيه مهام التهيئة وبنود الإخلاء لو موديولاتهم مفعّلة)
  tasks: moduleDef({
    nameAr: 'المهام', group: 'core', core: true, dependsOn: ['employees'], softUses: ['onboarding', 'offboarding'],
    description: 'تكليف موظف أو دور بمهمة بموعد وإثبات، وصندوق «مهامي»، وتذكير وتصعيد المتأخر',
    permissions: ['tasks.manage', 'tasks.view_all', 'tasks.assign_any'],
    routes: ['/tasks', '/my/tasks'],
    // B4.8 (ب): مهام مراجعة البيانات اللي عدّت مدة الاحتفاظ (بتتعمل كمهام، فتبع موديول المهام)
    jobs: ['tasks.reminders', 'privacy.retention-alerts'],
    features: {
      // إضافة المالك 6 أكتوبر: تقييم اختياري للمهام المعلّمة — مقفول لحد ما الشركة تقرر. الالتزام بالميعاد ومرات الرجوع شغالين من غيره
      'tasks.rating': {
        nameAr: 'تقييم المهام المنفذة',
        description: 'اللي بيكلّف بمهمة يعلّمها «تحتاج تقييم»، وبعد ما تخلص يقيّم تنفيذها من 1 لـ5 بتعليق اختياري. مفيش تقييم إلزامي، ومفيش درجة بتتحسب لوحدها',
        default: false,
      },
    },
  }),
  documents: moduleDef({
    nameAr: 'المستندات والخطابات', group: 'core', core: true, dependsOn: ['employees'],
    description: 'مستندات الموظفين ومسوغات التعيين وقوالب المستندات والخطابات',
    permissions: ['documents.manage'],
    routes: ['/employees/documents', '/employees/hiring-documents', '/my/documents', '/settings/documents', '/settings/document-templates', '/settings/letter-templates'],
    // B2.15-ب: وجهة «تجديد مستند» (أي نوع طلب وجهته دي بيتبع الموديول)
    requestHandlers: ['letter_pdf_generator', 'document_renewal'],
    // B2.3: حدث «مستند هينتهي» للطابور
    jobs: ['documents.expiry-events'],
  }),
  // B2.7: لوائح الشركة بنسخ وجمهور، وإقرار الموظف بيها عند الدخول (القفل في الخادم بعد مهلة السماح). أساسي زي المهام: من غير سياسة
  // إلزامية منشورة مالوش أي أثر
  policies: moduleDef({
    nameAr: 'السياسات والإقرار', group: 'core', core: true, dependsOn: ['documents'],
    description: 'مكتبة سياسات الشركة بنسخ وجمهور، وإقرار الموظف بيها عند الدخول، وتقرير مين أقرّ',
    permissions: ['policies.manage', 'policies.report'],
    routes: ['/policies', '/my/policies'],
  }),
  reports: moduleDef({
    nameAr: 'التقارير', group: 'core', core: true,
    description: 'لوحة التقارير والتقارير المالية',
    permissions: ['reports.view', 'reports.save'],
    routes: ['/reports'],
    jobs: ['reports.scheduled'],
    features: {
      // B5.9: بانِي التقارير — مقفول لحد ما الشركة تقرر (باقة «كامل»)
      'reports.builder': {
        nameAr: 'بانِي التقارير',
        description: 'تقرير من اختيارك: مصدر (موظفين، حضور، إجازات، طلبات، رواتب) وأعمدة وفلاتر وتجميع، وحفظه ومشاركته مع أدوار — كل قارئ بصلاحياته ونطاق فروعه',
        default: false,
        routes: ['/reports/builder'],
      },
    },
  }),

  // ===== الوقت والحضور =====
  attendance: moduleDef({
    nameAr: 'الحضور والبصمة', group: 'time', dependsOn: ['employees'], softUses: ['shifts'],
    description: 'أجهزة البصمة وسجل الحضور والتصحيح واستثناءات الحضور',
    permissions: ['attendance.view_all', 'attendance.manage', 'attendance.sync', 'attendance_exemption.view', 'attendance_exemption.manage',
      'attendance_exemption.approve', 'attendance_exemption.approve_executive'],
    routes: ['/attendance', '/my/attendance'],
    requestHandlers: ['attendance_log', 'attendance_corrections', 'attendance_trips'],
    jobs: ['attendance.materialize-absences', 'attendance.device-sync'],
    features: {
      // B5.6: بصمة من الموبايل بموقع ونطاق جغرافي لكل فرع — مقفولة لحد ما الشركة تقرر
      'attendance.mobile_punch': {
        nameAr: 'بصمة الموبايل',
        description: 'الموظف بيسجّل بصمته من الموبايل جوه نطاق موقع متعرّف لفرعه (الحكم على الخادم وبوقته)، وكل محاولة بتتسجّل',
        default: false,
        routes: ['/my/punch', '/attendance/punch-sites'],
      },
    },
  }),
  shifts: moduleDef({
    nameAr: 'الورديات والجداول', group: 'time', dependsOn: ['attendance'],
    description: 'الورديات وجداول العمل والجدول الأسبوعي',
    routes: ['/attendance/shifts', '/attendance/weekly-schedule'],
    requestHandlers: ['shift_schedule'],
    features: {
      // B5.5: أدوات الجدولة المتقدمة فوق الجدول الأسبوعي القايم — مقفولة لحد ما الشركة تقرر
      'shifts.advanced': {
        nameAr: 'الجدولة المتقدمة',
        description: 'نسخ أسبوع، وأنماط تدوير الورديات، ونشر جدول الأسبوع للموظفين بإشعار',
        default: false,
        routes: ['/attendance/schedule-tools'],
      },
      // B5.5 (ج): طلب تبديل الوردية القايم مابيتنفّذش غير بموافقة الطرف التاني — مقفولة لحد ما الشركة تقرر
      'shifts.swap_consent': {
        nameAr: 'تبديل الوردية بموافقة الطرف التاني',
        description: 'الزميل المطلوب التبديل معاه لازم يوافق قبل ما التبديل يتنفّذ بعد اعتماد المدير',
        default: false,
        routes: ['/my/shift-swaps'],
      },
    },
  }),
  overtime: moduleDef({
    nameAr: 'الإضافي ودوام العطلات', group: 'time', dependsOn: ['attendance'], softUses: ['payroll'],
    description: 'اكتشاف الإضافي واعتماده وفتراته، وأوامر دوام العطلات',
    permissions: ['overtime.confirm', 'overtime.adjust'],
    routes: ['/attendance/overtime', '/attendance/holiday-work'],
    requestHandlers: ['overtime_entries', 'overtime_auto', 'holiday_work'],
    jobs: ['overtime.reconcile-auto'],
  }),
  leave: moduleDef({
    nameAr: 'الإجازات والأذونات', group: 'time', dependsOn: ['employees'], softUses: ['attendance', 'payroll'],
    description: 'أنواع الإجازات والأرصدة والترحيل وإقفال السنة والأذونات',
    permissions: ['leaves.view_all', 'leaves.revoke', 'leave_balances.manage'],
    routes: ['/leaves', '/my/leaves', '/attendance/permissions', '/settings/permission-types'],
    requestTypes: ['PERMISSION'],
    // المعالجات القديمة (leave_calendar*) لسه بتتنفذ لأنواع محفوظة في قواعد قديمة
    requestHandlers: ['leave_deduct_balance', 'leave_no_balance', 'leave_balance_restore', 'leave_calendar_balance', 'leave_calendar',
      'leave_calendar_payroll', 'leave_calendar_once'],
    jobs: ['leave.year-start', 'leave.attachment-deadline'],
  }),

  // ===== الرواتب والفلوس =====
  payroll: moduleDef({
    nameAr: 'الرواتب والمسير', group: 'money', dependsOn: ['employees'], softUses: ['attendance', 'leave', 'loans'],
    description: 'معادلات الرواتب والمسيرات واعتمادها وصرفها والخصومات والمكافآت والبدلات والتأمينات',
    permissions: ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.disburse', 'payroll.reopen', 'payroll.cancel',
      'payroll.reverse', 'payroll.policy.manage', 'payroll.chain_manage', 'payroll.self_approval_licence',
      'deductions.view', 'deductions.approve', 'deductions.manage', 'bonuses.view', 'bonuses.approve', 'bonuses.manage', 'bonuses.exceed_cap',
      'financial_exemption.view', 'financial_exemption.grant', 'financial_exemption.approve', 'financial_exemption.override_limits'],
    routes: ['/payroll', '/my/payslips', '/my/deductions', '/my/bonuses', '/my/exemptions', '/reports/payroll-register', '/reports/payroll-cost',
      '/reports/deductions', '/reports/overtime', '/reports/cost-centers'],
    requestTypes: ['PAYROLL_DEDUCTION', 'PAYROLL_BONUS'],
    requestHandlers: ['salary_update_history', 'payroll_bonus', 'payroll_allowance', 'payroll_adjustment', 'payroll_bank_secure'],
    jobs: ['payroll.daily-accrual', 'payroll.deductions-sla'],
    features: {
      // B1.14 (الراتب الحي): الموظف يشوف مستحقه وهو بيتكوّن — مقفولة لحد ما الشركة تقرر
      'payroll.live_employee_view': {
        nameAr: 'مستحق الموظف التقديري لحد امبارح',
        description: 'كارت في بوابة الموظف بمستحقه التقديري من أول فترة الرواتب لحد امبارح، ومبلغ الخصم أو الإضافي جنب كل يوم في «حضوري». تقديري، والنهائي في القسيمة بعد الاعتماد',
        default: false,
      },
    },
  }),
  loans: moduleDef({
    nameAr: 'السلف والالتزامات', group: 'money', dependsOn: ['payroll'],
    description: 'طلبات السلف وسقوفها وأقساطها والسداد المبكر والاسترداد بعد الإنهاء',
    permissions: ['loans.policies', 'loans.exceptional', 'loans.cap_override', 'loans.repay', 'loans.disburse', 'loans.write_off'],
    routes: ['/payroll/loans', '/my/loans', '/reports/loans'],
    requestHandlers: ['loans_installments', 'loan_installment_defer', 'loan_early_settlement'],
  }),
  expenses: moduleDef({
    nameAr: 'المصروفات', group: 'money', dependsOn: ['requests'], softUses: ['payroll'],
    description: 'طلبات صرف المصروفات وبدل السفر (الشكل البسيط الموجود)',
    permissions: ['expenses.manage'],
    requestHandlers: ['expense_register', 'expense_report', 'travel_advance'],
    features: {
      // B5.3 (أ): تقرير ببنود وإيصالات وحدود للفئات، بيتقدّم كطلب — مقفولة لحد ما الشركة تقرر
      'expenses.reports': {
        nameAr: 'تقارير المصروفات',
        description: 'تقرير مصروفات بأكتر من بند وإيصال لكل بند وحد لكل فئة (تحذير أو منع)، بيتقدّم كطلب في سلسلته وبيتصرف قيد واحد في الدفتر عند الاعتماد النهائي',
        default: false,
        routes: ['/expenses', '/my/expenses'],
      },
    },
  }),

  // ===== دورة الموظف =====
  onboarding: moduleDef({
    nameAr: 'التهيئة', group: 'people', dependsOn: ['employees'], softUses: ['documents'],
    description: 'مهام تهيئة الموظف الجديد، وقرار فترة التجربة',
    routes: ['/employees/onboarding', '/my/probation'],
    // B3.1-ج: مهمة «قرار فترة التجربة» على المدير قبل نهايتها
    jobs: ['onboarding.probation-tasks'],
    features: {
      // B3.1-ب: حساب الموظف اللي مباشرته لسه جاية بيفتح بوابة التهيئة بس — مقفولة لحد ما الشركة تقرر
      'onboarding.preboarding': {
        nameAr: 'بوابة التهيئة قبل المباشرة',
        description: 'حساب الموظف الجديد لحد تاريخ مباشرته بيفتح مستنداته والسياسات ومهامه بس (من غير باقي البوابة ومن غير صلاحيات إدارية)',
        default: false,
      },
    },
  }),
  custody: moduleDef({
    nameAr: 'العهد والأصول', group: 'people', dependsOn: ['employees'], softUses: ['offboarding'],
    description: 'سجل الأصول وتسليم العهدة وإرجاعها ونقلها وبلاغ الفقد',
    permissions: ['custody.assign', 'approve.custody'],
    routes: ['/employees/custody', '/my/custody', '/settings/asset-types'],
    requestHandlers: ['custody_assignments_ack', 'custody_assignments', 'custody_return', 'custody_transfer', 'custody_finance'],
  }),
  offboarding: moduleDef({
    nameAr: 'إنهاء الخدمة والتصفية', group: 'people', dependsOn: ['employees'], softUses: ['payroll', 'custody'],
    description: 'الاستقالة والإنهاء وإخلاء الطرف والتصفية ومكافأة نهاية الخدمة',
    permissions: ['offboarding.manage', 'settlement.edit', 'settlement.approve'],
    routes: ['/offboarding', '/employees/*/terminate', '/employees/*/settlement'],
    requestHandlers: ['employee_status'],
    jobs: ['offboarding.finalize-due'],
  }),

  // ===== التوظيف والمواهب =====
  recruitment: moduleDef({
    nameAr: 'التوظيف', group: 'talent', dependsOn: ['employees'], preset: 'standard',
    description: 'احتياج التوظيف والوظائف الشاغرة، ومسار المرشحين والتعيين منه',
    permissions: ['candidates.manage', 'candidates.approve_offers'],
    // المتقدمين والوظائف الشاغرة (B3.2) شاشات حقيقية؛ باقي ما تحت /recruitment شاشات عرض (DEMO_ROUTES) لحد ما الموديول الكامل ينزل
    // B3.3-أ: «وظائف داخلية» في البوابة (/my/jobs). B3.3-ب: صفحة الوظائف العامة (/careers) — صفحتها من غير دخول، والخادم بيقفلها بميزتها
    // B3.4-ب: شاشة المقابلات بقت حقيقية (كانت شاشة عرض)، و«مقابلاتي» للمحاور في البوابة
    // B3.5-أ: شاشة العروض بقت حقيقية (كانت شاشة عرض)، ولينك رد المرشح على عرضه (/careers/offers/<رمز>)
    routes: ['/recruitment', '/recruitment/applicants', '/recruitment/jobs', '/recruitment/interviews', '/recruitment/offers', '/recruitment/metrics', '/my/jobs', '/my/interviews', '/careers', '/careers/*',
      '/careers/offers/*'],
    // B3.2-أ: طلب «احتياج توظيف» ووجهته (الاعتماد بيعمل وظيفة شاغرة مسودة)
    requestTypes: ['RECRUITMENT_REQUISITION'],
    requestHandlers: ['recruitment_requisition'],
    features: {
      // B3.3-ب: مسارات من غير دخول — مقفولة لحد ما الشركة تقرر (والسيرفر يبقى متاح للمتقدمين)
      // B6.10: اقتراحات المساعد في التوظيف — مقفولة، ومحتاجة موديول «الذكاء الاصطناعي» مفتوح. اقتراح بس: القبول والرفض للإنسان
      'recruitment.ai_cv': { nameAr: 'قراءة السيرة الذاتية بالمساعد', default: false,
        description: 'ملخص مقترح لسيرة المرشح (خبرة، آخر وظيفة، مهارات، مؤهل) لملاحظات ملفه. السيرة بتتبعت لمزوّد النموذج. مسؤول التوظيف هو اللي بيحفظ' },
      'recruitment.ai_ranking': { nameAr: 'ترتيب مقترح للمرشحين', default: false,
        description: 'ترتيب مقترح لمرشحي الوظيفة بسبب لكل واحد، من غير أسماء عند المزوّد. مابينقلش مرحلة حد ومابيقبلش ولا بيرفض' },
      'recruitment.public_careers': {
        nameAr: 'صفحة الوظائف العامة والتقديم من لينك',
        description: 'صفحة من غير دخول بتعرض الوظائف المنشورة «خارجي»، ولينك تقديم لكل وظيفة: الاسم والبريد والموبايل والسيرة الذاتية وموافقة البيانات — والمتقدّم بيدخل مرشح على الوظيفة',
        default: false,
      },
    },
  }),
  // B2.16: الإعلانات — إعلان لجمهور «مين + فين» بتاريخ نشر وانتهاء، ولوحته في البوابة، وتقرير مين قرا. موديول جديد = مقفول لحد ما
  // الشركة تفتحه، وفي الباقة الأساسية
  announcements: moduleDef({
    nameAr: 'الإعلانات', group: 'people', dependsOn: ['employees'], softUses: ['notifications'], defaultEnabled: false,
    description: 'إعلان لجمهور محدد (مين + فين) بتاريخ نشر وانتهاء، ولوحة الإعلانات في البوابة، وتقرير مين قرا',
    permissions: ['announcements.manage'],
    routes: ['/announcements'],
    features: {
      // B2.16-ب: تاريخ ميلاد وتاريخ تعيين زمايل الفرع — مقفولة لحد ما الشركة تقرر
      'announcements.occasions': {
        nameAr: 'أعياد الميلاد وسنوات الخدمة',
        description: 'كارت على صفحة الإعلانات فيه زمايل فرعك اللي عيد ميلادهم أو ذكرى تعيينهم النهارده أو خلال أسبوع — باليوم والشهر بس، من غير سنة الميلاد ولا السن',
        default: false,
      },
    },
  }),

  // B2.14: لوحة «فريقي» للمدير الهيكلي (من غير دور إداري) — قراءة بنطاق فريقه في الهيكل. شاشة جديدة بتعرض بيانات موظفين لقارئ جديد:
  // مقفولة لحد ما الشركة تفتحها (زي الوظائف المعتمدة)، وفي الباقة الأساسية
  manager: moduleDef({
    nameAr: 'لوحة «فريقي»', group: 'people', dependsOn: ['employees'], softUses: ['attendance', 'leave', 'tasks'], defaultEnabled: false,
    description: 'المدير الهيكلي بيشوف فريقه: حضورهم النهارده، وإجازاتهم القريبة، وعقد أو تجربة أو مستند مين هينتهي، والمستني منه',
    routes: ['/my/team'],
  }),

  // B3.6: إدارة الأداء — الأهداف أولًا (الدورات والقوالب والمعايرة في B3.7 وB3.8؛ باقي شاشات /performance شاشات عرض لحد ما ينزلوا).
  // موديول جديد = مقفول لحد ما الشركة تفتحه
  performance: moduleDef({
    nameAr: 'إدارة الأداء', group: 'talent', dependsOn: ['org', 'employees'], softUses: ['tasks'], preset: 'standard', defaultEnabled: false,
    description: 'أهداف الموظفين والأقسام والشركة، ودورات التقييم: نماذج بأقسام موزونة، تقييم ذاتي وتقييم المدير بأدلة من النظام، ودرجة محسوبة بالأوزان',
    permissions: ['performance.manage', 'performance.calibrate'],
    // B3.7-ب: التقييمات ودوراتها ونماذجها ونموذج التقييم بقوا حقيقيين (كانوا شاشات عرض)؛ «تقييم جديد» لسه شاشة عرض
    routes: ['/performance/goals', '/performance', '/performance/cycles', '/performance/templates', '/performance/*'],
    features: {
      // B5.10: تلات ميزات «لاحقًا» في G10 — مقفولة لحد ما الشركة تقرر (باقة «كامل»)
      // B6.10: مسودة ملخص التقييم بالمساعد — مقفولة، ومحتاجة موديول «الذكاء الاصطناعي» مفتوح. من غير درجة مقترحة، والمدير هو اللي بيسلّم
      'performance.ai_draft': { nameAr: 'مسودة ملخص التقييم بالمساعد', default: false,
        description: 'مسودة لتعليق المدير من أدلة النظام (الأهداف والحضور والمهام) من غير اسم الموظف ومن غير أي درجة. المدير بيراجعها ويغيّرها ويسلّم من شاشته' },
      'performance.feedback360': {
        nameAr: 'تقييم 360',
        description: 'الموظف بيرشّح زملاء ومديره بيعتمد، ومرؤوسين المدير بيقيّموه؛ الرد من غير اسم صاحبه، والنتيجة بعد قفل الدورة وبحد أدنى للردود',
        default: false,
        routes: ['/my/feedback360'],
      },
      'performance.one_on_one': {
        nameAr: 'اجتماعات 1:1',
        description: 'اجتماع المدير المباشر مع مرؤوسه: أجندة مشتركة وملاحظات ومهام متابعة، وبيظهر في تقويم الطرفين',
        default: false,
        routes: ['/my/one-on-ones'],
      },
      'performance.recognition': {
        nameAr: 'التقدير بين الزملاء',
        description: 'كلمة شكر من موظف لزميل في فرعه بتظهر في قايمة الفرع — من غير أي أثر مالي',
        default: false,
        routes: ['/my/recognition'],
      },
    },
  }),
  // B3.9: التدريب — كتالوج الدورات والجلسات والتسجيل والشهادة، وشاشاته (كانت شاشات عرض) بقت حقيقية في الجزء (ب).
  // موديول جديد = مقفول لحد ما الشركة تفتحه
  training: moduleDef({
    nameAr: 'التدريب', group: 'talent', dependsOn: ['employees'], softUses: ['documents'], preset: 'standard', defaultEnabled: false,
    description: 'كتالوج الدورات، وجلساتها بالسعة والتكلفة، وتسجيل الموظفين وحضورهم وإكمالهم، والشهادة كمستند للموظف بتاريخ انتهائه وتنبيه تجديده',
    permissions: ['training.manage'],
    routes: ['/training', '/training/add', '/training/certificates', '/training/my-courses', '/training/plan', '/training/*'],
    // B3.9-ب: وجهة «طلب تدريب» (أي نوع طلب وجهته دي بيتبع الموديول)
    requestHandlers: ['training_enrollment'],
  }),
  // B3.10: مركز خدمات الموارد البشرية — على محرك الطلبات (فئة «استفسارات»: اعتماد فوري ومهمة على دور بمهلة وردود في التعليقات)، مش نظام تذاكر.
  // موديول جديد = مقفول لحد ما الشركة تفتحه (وأنواع الاستفسارات تبعه: مقفول = مابتظهرش في التقديم)
  helpdesk: moduleDef({
    nameAr: 'مركز الخدمات', group: 'people', dependsOn: ['employees', 'tasks'], preset: 'standard', defaultEnabled: false,
    description: 'استفسارات الموظفين للموارد البشرية على محرك الطلبات: مسؤول بمهلة، وردود في تعليقات الطلب، وتقييم الموظف للخدمة، وتقرير الأوقات والرضا',
    permissions: ['helpdesk.manage'],
    routes: ['/helpdesk'],
    requestTypes: ['INQUIRY_PAYROLL', 'INQUIRY_LEAVES', 'INQUIRY_DATA', 'INQUIRY_GENERAL'],
  }),
  // B3.11: الشكاوى والتحقيقات — ملف قضية بأطرافه ومطّلعيه وخطه الزمني، والاطلاع على مستوى القضية.
  // موديول جديد = مقفول لحد ما الشركة تفتحه
  cases: moduleDef({
    nameAr: 'الشكاوى والتحقيقات', group: 'people', dependsOn: ['employees'], preset: 'standard', defaultEnabled: false,
    description: 'ملف قضية سرّي للشكوى أو التظلم أو المخالفة: أطراف ومحقق وخط زمني (إفادات، أدلة، جلسات، إخطار ودفاع)، وقرار، واعتراض في مهلة — مايشوفوش غير المطّلعين عليه',
    permissions: ['cases.investigate', 'cases.penalties'],
    // B3.12: + لائحة الجزاءات
    routes: ['/cases', '/cases/penalties', '/cases/*'],
    // وجهة «فتح ملف قضية» (أي نوع طلب وجهته دي بيتبع الموديول)
    requestHandlers: ['case_open'],
  }),
  // B3.13: الاستبيانات — مجهولة بسرية حقيقية أو بالاسم، ونتايج مجمّعة بحد أدنى للمجموعة. موديول جديد = مقفول لحد ما الشركة تفتحه
  surveys: moduleDef({
    nameAr: 'الاستبيانات', group: 'people', dependsOn: ['employees'], preset: 'standard', defaultEnabled: false,
    description: 'استبيانات الرضا والـeNPS والنبض لجمهور محدد: الرد المجهول مايتربطش بصاحبه، والنتايج مجمّعة ومابتظهرش لمجموعة أقل من الحد الأدنى',
    permissions: ['surveys.manage'],
    routes: ['/surveys', '/surveys/*'],
  }),
  // B3.14: سجل المعالين — معالين الموظف بمستند هويتهم. موديول جديد = مقفول لحد ما الشركة تفتحه، وفي الباقة الأساسية
  dependents: moduleDef({
    nameAr: 'سجل المعالين', group: 'people', dependsOn: ['employees'], softUses: ['documents'], defaultEnabled: false,
    description: 'معالين الموظف (القرابة والهوية بتاريخ انتهائها): الموارد البشرية بتعدّل مباشرة، والموظف بطلب «تحديث المعالين»',
    permissions: ['dependents.manage'],
    // B3.14: وجهة «تحديث المعالين» (أي نوع طلب وجهته دي بيتبع الموديول)
    requestHandlers: ['dependents_update'],
  }),
  // B5.1: تخطيط الزيادات وسلّم الرواتب — نطاقات الدرجات ونسبة المقارنة ودورة الزيادات. موديول جديد = مقفول لحد ما الشركة تفتحه، وفي الباقة الكاملة
  compensation: moduleDef({
    nameAr: 'تخطيط الزيادات وسلّم الرواتب', group: 'money', dependsOn: ['payroll'], softUses: ['performance', 'positions'], preset: 'full', defaultEnabled: false,
    description: 'نطاق راتب لكل درجة ونسبة المقارنة، ودورة زيادات سنوية بميزانية لكل إدارة واقتراحات المديرين، والتطبيق على شهر المسير من تاريخ الراتب',
    permissions: ['compensation.manage'],
    routes: ['/compensation', '/compensation/*', '/my/raises'],
  }),
  // B5.2: المزايا والتأمين الطبي — وثائق التأمين وفئاتها وأهلية الفئة بالدرجة، واشتراكات الموظف ومعاليه. موديول جديد = مقفول لحد ما الشركة تفتحه، وفي الباقة الكاملة
  benefits: moduleDef({
    nameAr: 'المزايا والتأمين الطبي', group: 'people', dependsOn: ['dependents'], softUses: ['payroll', 'offboarding'], preset: 'full', defaultEnabled: false,
    description: 'وثائق التأمين الطبي وفئاتها، ومين يستحق أنهي فئة بدرجته، واشتراك الموظف ومعاليه وطلبات الإضافة والحذف لشركة التأمين',
    permissions: ['benefits.manage'],
    routes: ['/benefits'],
    features: {
      // B5.2 (ج): تذاكر السفر السنوية بالدرجة — تعريف استحقاق بس، مقفولة لحد ما الشركة تقرر
      'benefits.tickets': {
        nameAr: 'تذاكر السفر السنوية',
        description: 'استحقاق تذاكر سفر سنوية لكل درجة وظيفية (عدد التذاكر، وهل بتشمل المعالين) — تعريف وعرض بس، من غير رصيد ولا صرف',
        default: false,
      },
    },
  }),
  // B5.4: المهارات والإحلال — مكتبة مهارات، والمطلوب لكل وظيفة معتمدة، وتقييم مهارة الموظف وفجوته. موديول جديد = مقفول لحد ما الشركة تفعّله
  skills: moduleDef({
    nameAr: 'المهارات والإحلال', group: 'talent', dependsOn: ['employees', 'positions'], softUses: ['performance', 'training'], preset: 'full', defaultEnabled: false,
    description: 'مكتبة مهارات بمستويات، والمهارات المطلوبة لكل وظيفة معتمدة، وتقييم مهارة الموظف بمصدره، ومصفوفة فجوة للفريق، وخلفاء للوظائف الحرجة بدرجة جاهزية',
    permissions: ['skills.manage', 'succession.manage'],
    routes: ['/skills', '/my/skills'],
    features: {
      // B5.4 (ج): شبكة 9-box — الأداء من آخر تقييم معلن × تقدير الإمكانات؛ مقفولة لحد ما الشركة تقرر
      'skills.nine_box': {
        nameAr: 'شبكة 9-box',
        description: 'شبكة الأداء × الإمكانات لموظفين النطاق: الأداء من درجة آخر تقييم أداء معلن، والإمكانات تقدير يسجّله صاحب صلاحية الإحلال — سرّية',
        default: false,
      },
    },
  }),
  // B5.7: السلامة وإصابات العمل — بلاغ حادث من البوابة وسجل حوادث بتحقيق وإجراءات تصحيحية (مهام). موديول جديد = مقفول لحد ما الشركة تفعّله
  safety: moduleDef({
    nameAr: 'السلامة وإصابات العمل', group: 'people', dependsOn: ['employees'], softUses: ['leave', 'custody'], preset: 'full', defaultEnabled: false,
    description: 'بلاغ حادث من الموظف، وسجل حوادث بتصنيف وتحقيق وقفل، وإجراءات تصحيحية ومهمة إبلاغ الجهة كمهام بمواعيد، وربط الحادث بإجازة المصاب',
    permissions: ['safety.manage'],
    routes: ['/safety', '/my/safety'],
  }),
  // B5.8: ساعات المشاريع — مشروع ومهامه، وتسجيل ساعات الموظف واعتماد المدير المباشر، وتقرير ساعات. موديول جديد = مقفول لحد ما الشركة تفعّله
  timesheets: moduleDef({
    nameAr: 'ساعات المشاريع', group: 'time', dependsOn: ['employees'], softUses: ['attendance'], preset: 'full', defaultEnabled: false,
    description: 'مشاريع بعملائها ومهامها، وتسجيل ساعات الموظف يوميًا وإرسال الأسبوع لاعتماد المدير المباشر مع مقارنة بالحضور، وتقرير ساعات لكل مشروع',
    permissions: ['timesheets.manage'],
    routes: ['/timesheets', '/my/timesheets'],
    features: {
      // تكلفة المشروع بأجر الساعة — رقم معروض بس (مش في المسير)، ومقفولة لحد ما الشركة تقرر
      'timesheets.cost': {
        nameAr: 'تكلفة المشروع بأجر الساعة',
        description: 'تقرير ساعات المشاريع بيعرض تكلفة كل مشروع: الساعات المعتمدة × أجر ساعة الموظف (نفس مصدر تسعير الإضافي) — لصاحب صلاحية عرض الرواتب بس',
        default: false,
      },
    },
  }),
  // B6.3: التكاملات — مفاتيح بنطاقات قراءة ونطاق فروع، والـAPI العام للقراءة، والـwebhooks. موديول جديد = مقفول لحد ما الشركة تفعّله
  integrations: moduleDef({
    nameAr: 'التكاملات', group: 'core', dependsOn: ['employees'], preset: 'full', defaultEnabled: false,
    description: 'مفاتيح تكامل لأنظمة خارجية (كل مفتاح بنطاقات قراءة وفروع)، وAPI عام للقراءة بس، وأحداث موقّعة بتتبعت لنقاط استقبال',
    permissions: ['integrations.manage'],
    routes: ['/settings/integrations'],
  }),
  // B6.6: الذكاء الاصطناعي — حوكمة (سجل ai_actions) ومساعد قراءة بهوية المستخدم ونطاقه. موديول جديد = مقفول، وكل ميزة فيه مقفولة لوحدها
  ai: moduleDef({
    nameAr: 'الذكاء الاصطناعي', group: 'core', dependsOn: ['employees'], softUses: ['leave', 'attendance', 'payroll', 'policies'], preset: 'full', defaultEnabled: false,
    description: 'مساعد بيجاوب من بيانات النظام بهوية المستخدم وصلاحياته ونطاقه، وكل سؤال بيتسجّل. مزوّد النموذج بيتضبط على الخادم، ومفيش قرار بياخده المساعد',
    features: {
      'ai.read_assistant': { nameAr: 'مساعد القراءة', default: false, routes: ['/assistant'],
        description: 'الموظف بيسأل عن رصيده وطلباته وحضوره وقسيمته وسياسات الشركة، والرد من نفس بيانات شاشاته. للقراءة بس' },
      // B6.7: مساعد التنفيذ — بيجهّز معاينة (مكافأة، طلب إجازة) والمستخدم بيأكدها؛ التنفيذ بنفس مسار الشاشة وسلسلتها
      'ai.action_assistant': { nameAr: 'مساعد التنفيذ', default: false,
        description: 'المساعد بيجهّز طلب أو مكافأة بمعاينة كاملة، ومفيش حاجة بتتنفّذ غير لما المستخدم يأكد. التنفيذ بنفس مسار الشاشة وبنفس سلسلة الاعتماد' },
    },
    routes: ['/assistant'],
  }),
  // B2.11: الوظائف المعتمدة — وظيفة في وحدة بعدد معتمد، وتقرير «معتمد / مشغول / شاغر». موديول جديد = مقفول لحد ما الشركة تفعّله
  // (أول موديول defaultEnabled: false: مفيش حاجة كانت شغالة قبله)
  positions: moduleDef({
    nameAr: 'الوظائف المعتمدة', group: 'talent', dependsOn: ['org', 'employees'], softUses: ['recruitment'], preset: 'standard', defaultEnabled: false,
    description: 'وظيفة في قسم أو فريق بعدد معتمد، وتقرير «معتمد / مشغول / شاغر» لكل قسم، وربط الموظف بوظيفته عند التعيين',
    permissions: ['positions.view', 'positions.manage'],
    routes: ['/positions'],
    // B2.11-ب: طلب «وظيفة جديدة / زيادة عدد» ووجهة تنفيذه (أي نوع طلب وجهته دي بيتبع الموديول)
    requestTypes: ['POSITION_REQUEST'],
    requestHandlers: ['positions_headcount'],
    features: {
      'positions.enforce_on_hiring': {
        nameAr: 'التعيين على وظيفة معتمدة بس',
        description: 'التعيين لازم يكون على وظيفة معتمدة نشطة فيها شاغر في وحدة الموظف؛ من غير وظيفة أو على وظيفة مليانة مرفوض',
        default: false,
      },
    },
  }),
} as const satisfies Record<string, ModuleDef>

export type ModuleKey = keyof typeof MODULES
export const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[]
export const isModuleKey = (value: unknown): value is ModuleKey => typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODULES, value)
export const moduleDefOf = (key: ModuleKey): ModuleDef => MODULES[key]

/** كل المزايا الفرعية بمفتاحها وموديولها */
export const MODULE_FEATURES: Record<string, ModuleFeatureDef & { module: ModuleKey }> = Object.fromEntries(
  MODULE_KEYS.flatMap((module) => Object.entries(moduleDefOf(module).features).map(([key, def]) => [key, { ...def, module }])),
)
export const isFeatureKey = (value: unknown): value is string => typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODULE_FEATURES, value)

/**
 * مسارات واجهة ببيانات عرض ثابتة من غير خلفية (الشاشات الوهمية): مقفولة دايمًا إلا مع ميزة platform.demo_screens.
 * بتتشال من هنا لما الموديول الحقيقي ينزل (المرحلة 3 و5) وشاشته تاخد مكانها.
 * النجمة = جزء واحد من المسار (رقم سجل)، والمسارات الثابتة تحت نفس الأب بتكسب عليها.
 */
export const DEMO_SCREENS_FEATURE = 'platform.demo_screens'
// B3.9-ب: شاشات التدريب خرجت من هنا (بقت تبع موديول التدريب)
export const DEMO_ROUTES = ['/performance/new', '/recruitment/add', '/recruitment/*', '/reports/custom']

const segmentsOf = (path: string) => path.split('?')[0].split('#')[0].split('/').filter(Boolean)

/** طول المطابقة (عدد الأجزاء) لو النمط بادئة للمسار، وإلا -1. النمط '/' بيطابق الصفحة الرئيسية بس. */
function matchLength(pattern: string, path: string): number {
  const want = segmentsOf(pattern), have = segmentsOf(path)
  if (want.length === 0) return have.length === 0 ? 0 : -1
  if (have.length < want.length) return -1
  for (let index = 0; index < want.length; index++) if (want[index] !== '*' && want[index] !== have[index]) return -1
  return want.length
}

/** نمط بنجمة أضعف من نمط ثابت بنفس الطول */
const score = (pattern: string, path: string): number => {
  const length = matchLength(pattern, path)
  return length < 0 ? -1 : length * 2 - (pattern.includes('*') ? 1 : 0)
}

export interface RouteOwner {
  /** الموديول صاحب المسار، أو null لو المسار مش مسجّل (بيتعامل كأساسي) */
  module: ModuleKey | null
  /** ميزة فرعية لازم تبقى مفعّلة (الشاشات الوهمية، أو ميزة ليها مساراتها) */
  feature: string | null
}

/**
 * صاحب مسار الواجهة: أطول نمط مطابق بيكسب، والثابت قبل النجمة عند نفس الطول.
 * مسار العرض (DEMO_ROUTES) بيكسب لو نمطه أدق من أدق مسار موديول: /recruitment/add عرض، و/recruitment/applicants حقيقي.
 */
export function routeOwner(pathname: string): RouteOwner {
  let module: ModuleKey | null = null, moduleScore = -1
  for (const key of MODULE_KEYS) {
    for (const pattern of moduleDefOf(key).routes) {
      const value = score(pattern, pathname)
      if (value > moduleScore) { moduleScore = value; module = key }
    }
  }
  // مسار ميزة فرعية (B5.3): لو نمطه مش أضعف من أدق مسار موديول، الشاشة تبع الميزة وموديولها
  let feature: string | null = null, featureScore = -1
  for (const [key, def] of Object.entries(MODULE_FEATURES)) {
    for (const pattern of def.routes ?? []) {
      const value = score(pattern, pathname)
      if (value > featureScore) { featureScore = value; feature = key }
    }
  }
  const demoScore = DEMO_ROUTES.reduce((best, pattern) => Math.max(best, score(pattern, pathname)), -1)
  if (feature !== null && featureScore >= moduleScore && featureScore >= demoScore) return { module: MODULE_FEATURES[feature].module, feature }
  return { module, feature: demoScore > moduleScore ? DEMO_SCREENS_FEATURE : null }
}

/** موديول نوع طلب: بالكود لو مسجّل بالاسم، وإلا بمعالج التنفيذ؛ غير كده محرك الطلبات نفسه (أساسي). */
export function moduleOfRequestType(type: { code?: string | null; destinationHandler?: string | null }): ModuleKey {
  for (const module of MODULE_KEYS) {
    const def = moduleDefOf(module)
    if (type.code && def.requestTypes.includes(type.code)) return module
  }
  for (const module of MODULE_KEYS) {
    const def = moduleDefOf(module)
    if (type.destinationHandler && def.requestHandlers.includes(type.destinationHandler)) return module
  }
  return 'requests'
}

/** موديول مهمة مجدولة باسمها */
export function moduleOfJob(job: string): ModuleKey | null {
  return MODULE_KEYS.find((module) => moduleDefOf(module).jobs.includes(job)) ?? null
}

/**
 * صلاحيات تابعة لموديول اختياري ومسارات أساسية بتطلبها: تعديل الراتب في ملف الموظف محتاج payroll.approve، وقواعد جدول الدوام
 * (أساسية مع أيام العمل) محتاجة attendance.manage. بتفضل ظاهرة في شاشة الأدوار والمستخدمين حتى لو موديولها مقفول.
 */
export const PERMISSIONS_USED_BY_CORE: readonly string[] = ['payroll.approve', 'attendance.manage']

/** الصلاحية تتعرض في شاشة الأدوار والمستخدمين؟ (موديولها مفعّل، أو مسار أساسي بيطلبها) */
export function permissionShown(permission: string, enabledModules: ReadonlySet<string> | readonly string[]): boolean {
  const has = (module: string) => Array.isArray(enabledModules) ? enabledModules.includes(module) : (enabledModules as ReadonlySet<string>).has(module)
  return PERMISSIONS_USED_BY_CORE.includes(permission) || has(moduleOfPermission(permission) ?? 'platform')
}

/** موديول صلاحية (شاشة الأدوار). null = صلاحية مش مسجّلة لموديول. */
export function moduleOfPermission(permission: string): ModuleKey | null {
  return MODULE_KEYS.find((module) => moduleDefOf(module).permissions.includes(permission)) ?? null
}

/** الموديولات اللي في باقة (وكل اللي في الباقات الأقل)، ومعاها الأساسي دايمًا. */
export function modulesOfPreset(preset: ModulePreset): ModuleKey[] {
  const rank = MODULE_PRESET_ORDER.indexOf(preset)
  return MODULE_KEYS.filter((module) => {
    const def = moduleDefOf(module)
    return def.core || (def.preset !== null && MODULE_PRESET_ORDER.indexOf(def.preset) <= rank)
  })
}

export interface ModulesState {
  /** صفوف القاعدة: مفتاح الموديول ← مفعّل؟ (الغايب = الافتراضي) */
  modules: Record<string, boolean>
  /** صفوف القاعدة: مفتاح الميزة ← مفعّلة؟ (الغايب = الافتراضي) */
  features: Record<string, boolean>
}

/** الموديول مفعّل فعليًا: أساسي، أو صفه (أو افتراضيه) مفعّل وكل اللي بيعتمد عليهم مفعّلين فعليًا. */
export function moduleEnabled(state: ModulesState, module: ModuleKey, seen: ReadonlySet<string> = new Set()): boolean {
  const def = moduleDefOf(module)
  if (def.core) return true
  if (seen.has(module)) return false
  const own = Object.prototype.hasOwnProperty.call(state.modules, module) ? state.modules[module] : def.defaultEnabled
  if (!own) return false
  const next = new Set(seen).add(module)
  return def.dependsOn.every((dependency) => isModuleKey(dependency) && moduleEnabled(state, dependency, next))
}

/** الميزة مفعّلة فعليًا: موديولها مفعّل، وصفها (أو افتراضيها) مفعّل. */
export function featureEnabled(state: ModulesState, feature: string): boolean {
  const def = MODULE_FEATURES[feature]
  if (!def || !moduleEnabled(state, def.module)) return false
  return Object.prototype.hasOwnProperty.call(state.features, feature) ? state.features[feature] : def.default
}

/** المفعّل فعليًا كله (رد GET /modules/enabled قبل جمهور التفعيل) */
export function enabledSnapshot(state: ModulesState): { modules: ModuleKey[]; features: string[] } {
  return {
    modules: MODULE_KEYS.filter((module) => moduleEnabled(state, module)),
    features: Object.keys(MODULE_FEATURES).filter((feature) => featureEnabled(state, feature)),
  }
}

/**
 * شاشة صاحبها موديول وبياناتها من موديول تاني كمان: لازم الاتنين مفعّلين (نفس @RequireModule بتاع مسارها في الخادم).
 * «تقرير الإضافي المالي» شاشة رواتب بياناتها من الإضافي.
 */
export const ROUTE_ALSO_REQUIRES: ReadonlyArray<{ route: string; modules: readonly ModuleKey[] }> = [
  { route: '/reports/overtime', modules: ['overtime'] },
]

/** مسار الواجهة متاح؟ (الموديول مفعّل، والميزة لو ليه ميزة، وأي موديول تاني الشاشة محتاجاه) */
export function routeAvailable(pathname: string, enabled: { modules: readonly string[]; features: readonly string[] }): boolean {
  const owner = routeOwner(pathname)
  if (owner.feature && !enabled.features.includes(owner.feature)) return false
  if (owner.module !== null && !enabled.modules.includes(owner.module)) return false
  return ROUTE_ALSO_REQUIRES.every((extra) => matchLength(extra.route, pathname) < 0 || extra.modules.every((module) => enabled.modules.includes(module)))
}

/** الموديولات المفعّلة اللي بتعتمد على موديول (قفله مرفوض طول ما دول مفعّلين) */
export function enabledDependents(state: ModulesState, module: ModuleKey): ModuleKey[] {
  return MODULE_KEYS.filter((other) => other !== module && moduleDefOf(other).dependsOn.includes(module) && moduleEnabled(state, other))
}

/** اللي الموديول بيعتمد عليهم ومش مفعّلين (تفعيله مرفوض لحد ما يتفعّلوا) */
export function missingDependencies(state: ModulesState, module: ModuleKey): ModuleKey[] {
  return moduleDefOf(module).dependsOn.filter((dependency): dependency is ModuleKey => isModuleKey(dependency) && !moduleEnabled(state, dependency))
}
