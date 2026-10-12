'use strict'
// «النواة» — قايمة صريحة باللي مش تبع موديول بيتفتح ويتقفل (B-ADD.21، كلمة المالك 12 أكتوبر 2026).
// الاختبار module-map.test.cjs بيفشل لو شاشة تحت src/app أو كنترولر تحت api/src أو مهمة مجدولة مالهاش موديول اختياري ومش مكتوبة هنا
// بموديولها الأساسي. يعني: شاشة جديدة تحت /settings أو /my أو /employees مابتنزلش «أساسية» بالصدفة عشان بادئة مسارها أساسية —
// يا إما مسارها يتسجّل لموديولها الاختياري في السجل (api/src/modules-registry/registry.ts)، يا إما تتكتب هنا بسببها.
// الموديولات الأساسية (core في السجل) مابتتقفلش: المنصة، الهيكل، الموظفين، بوابة الموظف، محرك الطلبات، الإشعارات، المهام، المستندات،
// السياسات، التقارير. قبل ما تضيف سطر هنا اسأل: لو الشركة قفلت موديول، الشاشة دي لسه ليها لازمة؟ لو لأ يبقى مكانها موديوله.

const CORE_PAGES = {
  // ===== platform — الدخول والجلسات، لوحة التحكم، الإعدادات العامة، المستخدمين والأدوار، شاشة الموديولات نفسها، التدقيق =====
  '/': 'platform',
  '/login': 'platform',
  '/login/change-password': 'platform',
  '/login/policies': 'platform', // شاشة إقرار السياسات عند الدخول (القفل نفسه في الخادم)
  '/login/totp': 'platform',
  '/settings': 'platform', // فهرس «الإعدادات العامة»: كل كارت فيه بيتفلتر بموديول شاشته
  '/settings/policies': 'platform', // «سياسات النظام»: مجموعات وخانات الموديولات الاختيارية فيها بتختفي مع موديولها
  '/settings/modules': 'platform',
  '/settings/users': 'platform',
  '/settings/roles': 'platform',
  '/settings/login-log': 'platform',
  '/settings/audit': 'platform',
  '/settings/scheduled-jobs': 'platform',
  '/settings/company': 'platform',
  '/settings/legal-entities': 'platform',
  '/settings/statutory': 'platform', // حزمة الدولة: قيم قانونية بيقراها أكتر من موديول (رواتب، إجازات، نهاية خدمة)
  '/settings/data-protection': 'platform',
  // تقويم الشركة أساسي: الحضور والإجازات والرواتب كلهم بيحسبوا منه، فمايتقفلش مع موديول واحد
  '/settings/work-days': 'platform',
  '/leaves/holidays': 'platform',
  // ===== org — الهيكل التنظيمي =====
  '/employees/org-chart': 'org',
  '/settings/branches': 'org',
  '/settings/departments': 'org',
  '/settings/teams': 'org',
  '/settings/cost-centers': 'org',
  // ===== employees — ملف الموظف الأساسي وعقده وحركته، وبياناته المرجعية =====
  '/employees': 'employees',
  '/employees/[id]': 'employees', // تابات وكروت الموديولات الاختيارية جوه الملف بتختفي مع موديولها
  '/employees/[id]/edit': 'employees',
  '/employees/add': 'employees',
  '/employees/archived': 'employees',
  '/employees/bulk-update': 'employees',
  '/employees/contracts': 'employees',
  '/employees/transfers': 'employees',
  '/settings/job-titles': 'employees',
  '/settings/grades': 'employees',
  '/settings/employee-fields': 'employees',
  '/settings/import': 'employees', // استيراد الهيكل والموظفين عند تجهيز عميل
  // ===== self_service — بوابة الموظف الأساسية =====
  '/profile': 'self_service',
  '/profile/security': 'self_service',
  '/calendar': 'self_service', // إجازات التقويم بتختفي مع موديول الإجازات (الخادم)
  // ===== requests — محرك الطلبات والاعتمادات (أنواع الموديول المقفول مابتتعرضش) =====
  '/requests': 'requests',
  '/approvals-inbox': 'requests',
  '/requests-console': 'requests',
  '/settings/request-types': 'requests',
  '/settings/approvals': 'requests',
  // ===== notifications — مركز الإشعارات وقنواته =====
  '/notifications': 'notifications',
  '/settings/notification-channels': 'notifications',
  // ===== tasks — المهام =====
  '/tasks': 'tasks',
  '/my/tasks': 'tasks',
  // ===== documents — المستندات والخطابات =====
  '/employees/documents': 'documents',
  '/employees/documents/create': 'documents',
  '/employees/hiring-documents': 'documents',
  '/my/documents': 'documents',
  '/settings/documents': 'documents',
  '/settings/document-templates': 'documents',
  '/settings/letter-templates': 'documents',
  // ===== policies — السياسات والإقرار =====
  '/policies': 'policies',
  '/policies/reports': 'policies',
  '/my/policies': 'policies',
  // ===== reports — لوحة التقارير (تقرير الموديول المقفول بيختفي منها) =====
  '/reports': 'reports',
  '/reports/custom': 'reports', // تحويل للوحة التقارير
}

// كنترولر وسمه على مستوى الكلاس موديول أساسي. المسارات اللي جواه وتبع موديول اختياري موسومة على الـhandler
// (مثبّتة بالاسم في routes-guards.test.cjs — HANDLER_TAGS)
const CORE_CONTROLLERS = {
  // ===== platform =====
  AuthController: 'platform', // الدخول والجلسات وتطبيق المصادقة
  UsersController: 'platform',
  RolesController: 'platform',
  EmployeeLoginAccountController: 'platform', // حساب دخول الموظف (في ملفه)
  ModulesController: 'platform',
  ModulesAdminController: 'platform',
  SettingsController: 'platform', // الإعدادات العامة؛ أنواع الإجازات والطلبات وسلاسل الاعتماد موسومة على مساراتها
  CurrencyContextController: 'platform',
  CatalogsController: 'platform', // الكتالوجات؛ الورديات والأجهزة وأنواع الأصول وأنواع الأذونات بموديولها من نوع الكتالوج
  AttendanceRuleController: 'platform', // تاريخ جداول أيام العمل (أساسي)؛ تاريخ تعريف الوردية بموديول الورديات
  LegalEntitiesController: 'platform',
  StatutoryPackController: 'platform',
  DataProtectionController: 'platform',
  BrandingController: 'platform',
  AuditController: 'platform',
  ScheduledJobsController: 'platform',
  QueueController: 'platform',
  FilesController: 'platform',
  HealthController: 'platform',
  DashboardController: 'platform', // الأرقام العامة؛ ويدجتات الحضور موسومة على مساراتها
  DashboardCardsController: 'platform', // كل كارت بموديوله وصلاحيته في الخدمة (الموديول المقفول 404)
  // ===== org =====
  OrgController: 'org',
  // ===== employees =====
  EmployeesController: 'employees',
  EmployeeExtrasController: 'employees', // سلف الموظف موسومة على مسارها
  EmployeeBulkUpdateController: 'employees',
  EmployeeCustomFieldsController: 'employees',
  EmployeeFieldsSettingsController: 'employees',
  EmployeeSelfPhotoController: 'employees',
  QualificationsController: 'employees',
  SetupImportController: 'employees',
  // ===== self_service =====
  PortalController: 'self_service', // التقويم؛ والإشعارات موسومة على مساراتها
  // ===== requests =====
  RequestsController: 'requests', // أرصدة الإجازات وتأكيد العهدة وتوجيه الإضافي موسومين على مساراتهم
  RequestCategoryChainsController: 'requests',
  // ===== notifications =====
  NotificationsController: 'notifications',
  NotificationChannelsController: 'notifications',
  // ===== tasks =====
  TasksController: 'tasks',
  // ===== documents =====
  DocsController: 'documents',
  HrDocumentsController: 'documents',
  HiringDocumentsController: 'documents',
  LettersController: 'documents',
  // ===== policies =====
  PoliciesController: 'policies',
  // ===== reports =====
  ReportsController: 'reports', // تقرير كل موديول اختياري موسوم على مساره
  SavedReportsController: 'reports',
  ReportBuilderController: 'reports', // وورا ميزة «بانِي التقارير»
  // ===== من غير وسم على الكلاس: كل مسار فيه موسوم بموديوله (حوار الطلب بالطلبات، وحوار المهمة بالمهام) =====
  CommentsController: null,
}

// مهمة مجدولة موديولها أساسي (أو مالهاش موديول خالص: null) — بتشتغل دايمًا
const CORE_JOBS = {
  'requests.escalations': 'requests',
  'requests.scheduled-transfers': 'employees', // تنفيذ النقل المؤجل: حركة الموظف أساسية
  'notifications.daily-digest': 'notifications',
  'tasks.reminders': 'tasks',
  'privacy.retention-alerts': 'tasks', // مهام مراجعة البيانات اللي عدّت مدة الاحتفاظ (بتتعمل كمهام)
  'documents.expiry-events': 'documents',
  'reports.scheduled': 'reports',
  'scheduler.prune-runs': null, // تنضيف سجل تشغيل المهام المجدولة نفسه
}

// مؤقّتات جوه الخادم برّه المجدول (setInterval): مش مهام شغل، ومابتكتبش بيانات
const INTERNAL_TIMERS = {
  'api/src/queue/queue.worker.ts': 'عامل طابور الأحداث (أساسي): كل مستهلك بيحكم بموديوله',
  'api/src/policies/policy-gate.ts': 'تحديث «فيه سياسة إلزامية منشورة؟» لقفل الدخول (موديول السياسات أساسي)',
  'api/src/mailbox/mail-vault.service.ts': 'مسح جلسات البريد المنتهية من الذاكرة (موديول البريد: مفيش جلسات والموديول مقفول، ومفيش أي كتابة)',
}

// شاشة ثابتة (من غير [رقم] في مسارها) ومالهاش بند في القايمة — بسببها. أي شاشة تانية لازم يبقى لها بند واحد في القايمة
const OFF_MENU_PAGES = {
  // من غير دخول
  '/login': 'صفحة الدخول',
  '/careers': 'صفحة الوظائف العامة للمتقدمين من برّه (من غير إطار النظام)',
  // خطوات جوه الدخول
  '/login/change-password': 'تغيير كلمة المرور — زرارها في كارت الحساب آخر القايمة',
  '/login/policies': 'إقرار السياسات عند الدخول — النظام بيفتحها لوحده',
  '/login/totp': 'تفعيل تطبيق المصادقة — النظام بيفتحها لوحده',
  '/profile/security': 'الأمان والجلسات — زرارها في كارت الحساب آخر القايمة',
  // بتتفتح من شاشتها
  '/payroll/salary-history': 'سجل الأجر المؤرخ — من ملف الموظف',
  '/reports/payroll-register': 'تقرير مالي — من كروت «لوحة التقارير»',
  '/reports/payroll-cost': 'تقرير مالي — من كروت «لوحة التقارير»',
  '/reports/deductions': 'تقرير مالي — من كروت «لوحة التقارير»',
  '/reports/loans': 'تقرير مالي — من كروت «لوحة التقارير»',
  '/reports/overtime': 'تقرير مالي — من كروت «لوحة التقارير»',
  // روابط قديمة بتحوّل لشاشتها الحالية
  '/my/exemptions': 'تحويل لـ«قسائم راتبي»',
  '/payroll/allowances': 'تحويل لـ«مسير الرواتب»',
  '/payroll/exemptions': 'تحويل لـ«مسير الرواتب»',
  '/payroll/payslips': 'تحويل لـ«مسير الرواتب»',
  '/payroll/formulas': 'تحويل لـ«معادلات الرواتب»',
  '/performance/new': 'تحويل لـ«التقييمات»',
  '/recruitment/add': 'تحويل لـ«إدارة الوظائف»',
  '/reports/custom': 'تحويل لـ«لوحة التقارير»',
}

module.exports = { CORE_PAGES, CORE_CONTROLLERS, CORE_JOBS, INTERNAL_TIMERS, OFF_MENU_PAGES }
