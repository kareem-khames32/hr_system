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
        description: 'شاشات ببيانات عرض ثابتة من غير خلفية: الأداء، والتدريب، والوظائف والمقابلات والعروض، والتقارير المخصصة. بتتقفل لحد ما الموديول الحقيقي ينزل.',
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
    permissions: ['employees.view', 'employees.create', 'employees.edit', 'employees.archive', 'transfers.view'],
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
    jobs: ['tasks.reminders'],
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
    requestHandlers: ['letter_pdf_generator'],
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
  }),
  shifts: moduleDef({
    nameAr: 'الورديات والجداول', group: 'time', dependsOn: ['attendance'],
    description: 'الورديات وجداول العمل والجدول الأسبوعي',
    routes: ['/attendance/shifts', '/attendance/weekly-schedule'],
    requestHandlers: ['shift_schedule'],
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
    requestHandlers: ['expense_register'],
  }),

  // ===== دورة الموظف =====
  onboarding: moduleDef({
    nameAr: 'التهيئة', group: 'people', dependsOn: ['employees'], softUses: ['documents'],
    description: 'مهام تهيئة الموظف الجديد',
    routes: ['/employees/onboarding'],
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
    description: 'مسار المرشحين والتعيين منه',
    permissions: ['candidates.manage'],
    // المتقدمين شاشة حقيقية؛ باقي ما تحت /recruitment شاشات عرض (DEMO_ROUTES) لحد ما الموديول الكامل ينزل
    routes: ['/recruitment', '/recruitment/applicants'],
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
export const DEMO_ROUTES = ['/performance', '/training', '/recruitment/add', '/recruitment/interviews', '/recruitment/offers', '/recruitment/*', '/reports/custom']

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
  /** ميزة فرعية لازم تبقى مفعّلة (الشاشات الوهمية) */
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
  const demoScore = DEMO_ROUTES.reduce((best, pattern) => Math.max(best, score(pattern, pathname)), -1)
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
