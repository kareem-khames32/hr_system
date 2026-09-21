// ============================================================
// سجل الصلاحيات المركزي — مصدر الحقيقة الوحيد
// كل نقطة حساسة في النظام = permission مفرد
// الأدوار = حزم (presets) من الصلاحيات، والـ overrides لكل مستخدم:
// النهائي = صلاحيات الدور + GRANTs − REVOKEs (super_admin يتخطى الكل)
// ============================================================

export const PERMISSIONS: Record<string, string> = {
  // الموظفون
  'employees.view': 'عرض قائمة الموظفين وملفاتهم',
  'employees.create': 'تعيين موظف جديد',
  'employees.edit': 'تعديل بيانات موظف',
  'employees.archive': 'أرشفة موظف',
  // التكوين
  'org.manage': 'إدارة الفروع والأقسام والفرق',
  // الحسابات والأدوار
  'users.manage': 'إدارة حسابات الدخول',
  'roles.manage': 'إدارة الأدوار والصلاحيات',
  // الطلبات
  'requests.view_all': 'كونسول الطلبات (سجل النطاق كاملاً)',
  'requests.create_on_behalf': 'تقديم طلبات نيابة عن أي موظف',
  // خطوات الاعتماد الوظيفية (تُستخدم في حل خطوات الدورات)
  'approve.hr': 'اعتماد خطوات الموارد البشرية',
  'approve.finance': 'اعتماد خطوات المالية',
  'approve.it': 'اعتماد خطوات تقنية المعلومات',
  'approve.custody': 'اعتماد خطوات أمين العهدة',
  'approve.payroll': 'اعتماد خطوات موظف الرواتب',
  'approve.executive': 'اعتماد الخطوات التنفيذية',
  // الحضور
  'attendance.view_all': 'عرض حضور النطاق',
  'attendance.manage': 'الجدولة والإدخال اليدوي وإعادة الحساب',
  'attendance.sync': 'أجهزة البصمة والمزامنة',
  'attendance_exemption.view': 'عرض استثناءات الحضور في النطاق',
  'attendance_exemption.manage': 'إنشاء وإلغاء طلبات استثناء الحضور',
  'attendance_exemption.approve': 'اعتماد وإنهاء استثناء الحضور للموارد البشرية',
  'attendance_exemption.approve_executive': 'الاعتماد التنفيذي لاستثناءات القيادات',
  'overtime.confirm': 'تأكيد الأوفرتايم المكتشف',
  'overtime.adjust': 'تخفيض دقائق الإضافي أثناء الاعتماد بسبب موثق',
  // الإجازات
  'leaves.view_all': 'سجل إجازات النطاق وأرصدته',
  'leaves.revoke': 'إلغاء إجازة معتمدة (استرجاع الرصيد وإعادة حساب الحضور)',
  'leave_balances.manage': 'الترحيل السنوي وإدارة الأرصدة',
  // الرواتب
  'payroll.view': 'عرض مسيرات الرواتب',
  'payroll.calculate': 'احتساب المسير',
  'payroll.approve': 'اعتماد المسير',
  'payroll.pay': 'صرف المسير',
  // قرار المالك 22 سبتمبر: «مسؤول صرف الرواتب» يعلّم صرف كل موظف في مسير معتمد ولا يعدّل أي رقم — منفصلة عن payroll.pay (قفل المسير كله)
  'payroll.disburse': 'تسجيل صرف الرواتب للموظفين (تم / لم يتم) بلا أي تعديل',
  // مين يعتمد المسير وبأي ترتيب = ضابط فصل المهام نفسه، فلا يمنحها إلا مدير النظام (SUPER_ADMIN_ONLY_GRANTS)
  'payroll.chain_manage': 'ضبط سلسلة اعتماد المسير',
  'payroll.reopen': 'إعادة فتح مسير معتمد للمراجعة بسبب موثق',
  'payroll.cancel': 'إلغاء مسودة مسير مع الاحتفاظ بأثرها',
  // C8 / الخطوة 31: عكس صرف مسير مصروف بمسير عكس مربوط (يعيد الإضافي والأقساط والقيود لحالتها قبل الصرف) — اعتماده وتنفيذه بصلاحيتي الاعتماد والصرف
  'payroll.reverse': 'عكس صرف مسير مصروف بمسير عكس مربوط بسبب موثق',
  // الخطوة 22 (B5، تصحيح المراجعة): رخصة الشركة الصغيرة تفك فصل المهام في الاعتماد — مستقلة عن settings.manage ولا يمنحها إلا مدير النظام
  'payroll.self_approval_licence': 'تفعيل أو إيقاف رخصة الشركة الصغيرة (يعتمد المسير من احتسبه)',
  // الخطوة 15: مجموعات السياسات (الاسم والنسخ والإعدادات والدورة) ونشرها منفصلة عن الاحتساب
  'payroll.policy.manage': 'إدارة مجموعات سياسات الرواتب ونشر نسخها',
  // C6 / الخطوة 29: السلف
  'loans.policies': 'إدارة سياسات سقوف السلف ونسخها',
  'loans.exceptional': 'إنشاء سلفة استثنائية لموظف فوق السقف بسبب موثق وشهر أول قسط',
  'loans.cap_override': 'اعتماد سلفة تجاوزت السقف باستثناء موثق',
  'loans.repay': 'تسجيل السداد المبكر وتحصيل أرصدة السلف بعد الإنهاء',
  'loans.write_off': 'شطب رصيد سلفة متبقٍ بعد انتهاء الخدمة بسبب موثق',
  // C2 / الخطوة 25: الخصومات المصنفة — الإنشاء للمدير الهيكلي بحسب نطاق النوع دون صلاحية نظام
  'deductions.view': 'عرض الخصومات المصنفة في نطاق الفرع',
  'deductions.approve': 'اعتماد خطوة الموارد البشرية في الخصومات المصنفة',
  'deductions.manage': 'إدارة أنواع الخصومات وإنشاء الخصم للموارد البشرية وإلغاؤه بسبب موثق',
  // C4 / الخطوة 27: المكافآت — الاقتراح للمدير الهيكلي على مرؤوسيه دون صلاحية نظام، والقرار الأخير للموارد البشرية
  'bonuses.view': 'عرض المكافآت في نطاق الفرع',
  'bonuses.approve': 'اعتماد خطوة الموارد البشرية في المكافآت',
  'bonuses.manage': 'إدارة أنواع المكافآت واقتراح المكافأة للموارد البشرية وإلغاؤها أو عكسها بسبب موثق',
  'bonuses.exceed_cap': 'اقتراح أو اعتماد مكافأة تتجاوز سقف نوعها من الراتب الأساسي',
  // الخطوة 26 (EX-01..08): الإعفاء المالي في مسير — منفصل عن استثناء الحضور
  'financial_exemption.view': 'عرض الإعفاءات المالية في المسيرات وتقرير حوكمتها في نطاق الفرع',
  'financial_exemption.grant': 'منح إعفاء مالي من خصم أو نوع خصم أو كل الخصومات القابلة لموظف في مسير محسوب',
  'financial_exemption.approve': 'اعتماد أو رفض الإعفاء المالي المحوّل للموارد البشرية (غير المانح)',
  'financial_exemption.override_limits': 'تجاوز حدود الإعفاء المالي بتبرير إضافي موثق (عدد إعفاءات الموظف، فترة التهدئة، إعادة الإعفاء)',
  // العهدة والمستندات
  'custody.assign': 'إسناد وإدارة العهد',
  'documents.manage': 'إدارة مستندات الموظفين',
  // إنهاء الخدمة
  'offboarding.manage': 'إدارة إخلاء الطرف وإنهاء الخدمة',
  'settlement.edit': 'تحرير بنود التصفية',
  'settlement.approve': 'اعتماد التصفية وقفلها',
  // عام
  'reports.view': 'مركز التقارير',
  'dashboard.view_all': 'لوحة التحكم الإدارية',
  'calendar.view_all': 'تقويم النطاق (إجازات الجميع)',
  'settings.manage': 'إعدادات النظام (المفاتيح والكتالوجات)',
  'request_types.manage': 'بانِي أنواع الطلبات',
  'approval_chains.manage': 'بانِي دورات الاعتماد',
  'candidates.manage': 'المرشحون والتعيين',
  'transfers.view': 'لوج النقل بين الفرق',
}

export type Permission = keyof typeof PERMISSIONS

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS)

// ===== شاشة الصلاحيات: كل صلاحية في السجل تحت وحدة واحدة ولها سطر شرح =====
// الاختبار api/test/roles-scope-presets.test.cjs بيفشل لو صلاحية اتضافت للسجل من غير وحدة أو شرح،
// فمفيش صلاحية تتوه من الشاشة تاني (approve.custody فضلت بلا أي دور يحملها لحد تدقيق 21 سبتمبر).
export const PERMISSION_MODULES: Array<{ key: string; labelAr: string; permissions: string[] }> = [
  { key: 'employees', labelAr: 'الموظفون', permissions: ['employees.view', 'employees.create', 'employees.edit', 'employees.archive', 'documents.manage', 'transfers.view'] },
  { key: 'recruitment', labelAr: 'التوظيف', permissions: ['candidates.manage'] },
  { key: 'org', labelAr: 'الهيكل التنظيمي', permissions: ['org.manage'] },
  { key: 'requests', labelAr: 'الطلبات', permissions: ['requests.view_all', 'requests.create_on_behalf'] },
  { key: 'approvals', labelAr: 'خطوات الاعتماد', permissions: ['approve.hr', 'approve.finance', 'approve.it', 'approve.custody', 'approve.payroll', 'approve.executive'] },
  {
    key: 'attendance', labelAr: 'الحضور والإضافي',
    permissions: [
      'attendance.view_all', 'attendance.manage', 'attendance.sync',
      'attendance_exemption.view', 'attendance_exemption.manage', 'attendance_exemption.approve', 'attendance_exemption.approve_executive',
      'overtime.confirm', 'overtime.adjust',
    ],
  },
  { key: 'leaves', labelAr: 'الإجازات', permissions: ['leaves.view_all', 'leaves.revoke', 'leave_balances.manage'] },
  {
    key: 'payroll', labelAr: 'الرواتب',
    permissions: [
      'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.disburse',
      'payroll.reopen', 'payroll.cancel', 'payroll.reverse',
      'payroll.policy.manage', 'payroll.chain_manage', 'payroll.self_approval_licence',
    ],
  },
  { key: 'loans', labelAr: 'السلف', permissions: ['loans.policies', 'loans.exceptional', 'loans.cap_override', 'loans.repay', 'loans.write_off'] },
  {
    key: 'adjustments', labelAr: 'الخصومات والمكافآت والإعفاءات',
    permissions: [
      'deductions.view', 'deductions.approve', 'deductions.manage',
      'bonuses.view', 'bonuses.approve', 'bonuses.manage', 'bonuses.exceed_cap',
      'financial_exemption.view', 'financial_exemption.grant', 'financial_exemption.approve', 'financial_exemption.override_limits',
    ],
  },
  { key: 'assets', labelAr: 'الأصول والعهد', permissions: ['custody.assign'] },
  { key: 'offboarding', labelAr: 'إنهاء الخدمة', permissions: ['offboarding.manage', 'settlement.edit', 'settlement.approve'] },
  { key: 'insights', labelAr: 'التقارير واللوحات', permissions: ['reports.view', 'dashboard.view_all', 'calendar.view_all'] },
  { key: 'access', labelAr: 'الحسابات والأدوار', permissions: ['users.manage', 'roles.manage'] },
  { key: 'settings', labelAr: 'إعدادات النظام', permissions: ['settings.manage', 'request_types.manage', 'approval_chains.manage'] },
]

// سطر واحد بيقول الصلاحية بتفتح إيه فعلًا (من جرد مسارات الـAPI، مش من اسمها)
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'employees.view': 'يشوف قائمة موظفي نطاقه ويفتح ملف أي واحد فيهم (بياناته وسجله ومؤهلاته) — قراءة بس',
  'employees.create': 'يعيّن موظف جديد ويدخّل بياناته وراتبه الأول',
  'employees.edit': 'يعدّل بيانات الموظف وعقده ومؤهلاته ويوقفه عن العمل، ويعدّل كذا موظف مرة واحدة من ملف إكسل',
  'employees.archive': 'يأرشف موظف (يخرجه من الخدمة) ويرجّعه على رأس العمل',
  'documents.manage': 'يرفع مستندات الموظفين ويعدّلها، ويصدر الخطابات الرسمية من القوالب',
  'transfers.view': 'يشوف سجل تنقلات الموظفين بين الفرق والأقسام — قراءة بس',
  'candidates.manage': 'يضيف المرشحين ويعدّل مراحلهم ويحوّل المرشح المقبول لموظف',
  'org.manage': 'ينشئ الفروع والأقسام والفرق ويعدّلها ويحدّد مديريها',
  'requests.view_all': 'يشوف كل طلبات موظفي نطاقه في كونسول الطلبات — قراءة بس، والقرار لأصحاب خطوات الاعتماد',
  'requests.create_on_behalf': 'يقدّم طلب (إجازة، إذن، سلفة...) باسم موظف تاني في نطاقه',
  'approve.hr': 'يعتمد أو يرفض الطلبات الواقفة على خطوة «الموارد البشرية»',
  'approve.finance': 'يعتمد أو يرفض الطلبات الواقفة على خطوة «المالية»',
  'approve.it': 'يعتمد أو يرفض الطلبات الواقفة على خطوة «تقنية المعلومات»',
  'approve.custody': 'يعتمد أو يرفض الطلبات الواقفة على خطوة «أمين العهدة» (تسليم العهد واستلامها وإخلاء الطرف)',
  'approve.payroll': 'يعتمد أو يرفض الطلبات الواقفة على خطوة «موظف الرواتب»',
  'approve.executive': 'يعتمد أو يرفض الطلبات الواقفة على خطوة «الإدارة التنفيذية»',
  'attendance.view_all': 'يشوف حضور موظفي نطاقه وبصماتهم وجداولهم والعمل الإضافي — قراءة بس',
  'attendance.manage': 'يدخّل بصمة يدوية ويحذفها، ويعمل جداول الدوام ودوام العطلات، ويعيد حساب الحضور — بيأثر على المسير مباشرة',
  'attendance.sync': 'يسحب البصمات من أجهزة البصمة ويشوف البصمات اللي مالهاش موظف',
  'attendance_exemption.view': 'يشوف طلبات استثناء الحضور (الإعفاء من البصمة) في نطاقه — قراءة بس',
  'attendance_exemption.manage': 'يطلب استثناء حضور لموظف ويلغي الطلب — القرار مش له',
  'attendance_exemption.approve': 'يعتمد استثناء الحضور أو يرفضه أو ينهيه — لا يمنحها إلا مدير النظام',
  'attendance_exemption.approve_executive': 'الاعتماد التنفيذي لاستثناء حضور القيادات — لا يمنحها إلا مدير النظام',
  'overtime.confirm': 'يأكّد ساعات الإضافي اللي النظام اكتشفها من البصمات عشان تدخل المسير',
  'overtime.adjust': 'يقلّل دقائق الإضافي وقت الاعتماد بسبب مكتوب — لا يمنحها إلا مدير النظام',
  'leaves.view_all': 'يشوف سجل إجازات موظفي نطاقه وأرصدتهم — قراءة بس',
  'leaves.revoke': 'يلغي إجازة معتمدة: الرصيد يرجع والحضور يتحسب من جديد',
  'leave_balances.manage': 'يقفل سنة الإجازات ويرحّل الأرصدة ويصفّي رصيد الموظف',
  'payroll.view': 'يشوف المسيرات وبنودها وقسائم الموظفين وكشف البنك (بأرقام الحسابات البنكية) والسلف والتقارير المالية',
  'payroll.calculate': 'يفتح المسير ويحتسبه ويعيد حسابه، ويدير البدلات والالتزامات وشيل الخصومات — من غير ما يعتمد',
  'payroll.approve': 'يعتمد المسير المحسوب ويسجّل تغييرات أساس الراتب — مايعتمدش مسير هو اللي حسبه',
  'payroll.pay': 'يقفل المسير المعتمد كـ«مصروف» (صرف المسير كله مرة واحدة)',
  'payroll.disburse': 'يعلّم على كل موظف في مسير معتمد «اتصرف / لسه» — من غير ما يغيّر أي رقم ولا حالة المسير',
  'payroll.reopen': 'يرجّع مسير معتمد لحالة «محسوب» بسبب مكتوب — لا يمنحها إلا مدير النظام',
  'payroll.cancel': 'يلغي مسودة مسير محسوب بسبب مكتوب — لا يمنحها إلا مدير النظام',
  'payroll.reverse': 'يعكس مسير اتصرف بمسير عكس مربوط بيه — لا يمنحها إلا مدير النظام',
  'payroll.policy.manage': 'ينشئ مجموعات سياسات الرواتب وينشر نسخها، ويعدّل شرائح التأخير وإعدادات التأمينات',
  'payroll.chain_manage': 'يحدّد مين يعتمد المسير وبأي ترتيب — لا يمنحها إلا مدير النظام',
  'payroll.self_approval_licence': 'يشغّل أو يوقف رخصة «اللي حسب المسير يعتمده» — بتفك فصل المهام، لا يمنحها إلا مدير النظام',
  'loans.policies': 'يعدّل سقوف السلف ونسخها (إعداد لكل الشركة)',
  'loans.exceptional': 'ينشئ سلفة استثنائية فوق السقف لموظف بسبب مكتوب',
  'loans.cap_override': 'يعتمد سلفة عدّت السقف باستثناء مكتوب — لا يمنحها إلا مدير النظام',
  'loans.repay': 'يسجّل السداد المبكر ويحصّل رصيد السلفة بعد انتهاء الخدمة',
  'loans.write_off': 'يشطب رصيد سلفة متبقي بعد انتهاء الخدمة (خسارة على الشركة) — لا يمنحها إلا مدير النظام',
  'deductions.view': 'يشوف الخصومات المصنفة على موظفي نطاقه — قراءة بس',
  'deductions.approve': 'يعتمد أو يرفض خطوة الموارد البشرية في الخصومات',
  'deductions.manage': 'يدير أنواع الخصومات، وينشئ خصم على موظف، ويلغيه أو يعكسه بسبب مكتوب',
  'bonuses.view': 'يشوف مكافآت موظفي نطاقه — قراءة بس',
  'bonuses.approve': 'يعتمد أو يرفض خطوة الموارد البشرية في المكافآت',
  'bonuses.manage': 'يدير أنواع المكافآت، ويقترح مكافأة لموظف، ويلغيها أو يعكسها بسبب مكتوب',
  'bonuses.exceed_cap': 'يقترح أو يعتمد مكافأة أعلى من سقف نوعها — لا يمنحها إلا مدير النظام',
  'financial_exemption.view': 'يشوف الإعفاءات المالية في المسيرات وتقرير حوكمتها — قراءة بس',
  'financial_exemption.grant': 'يعفي موظف من خصم (أو من كل خصوماته القابلة) في مسير محسوب',
  'financial_exemption.approve': 'يعتمد أو يرفض الإعفاء المالي المحوّل للموارد البشرية — مايعتمدش إعفاء هو اللي منحه',
  'financial_exemption.override_limits': 'يتخطى حدود الإعفاء المالي بتبرير مكتوب — لا يمنحها إلا مدير النظام',
  'custody.assign': 'يسجّل الأصول ويعدّلها ويخرجها من الخدمة، ويسلّم العهدة للموظف ويستلمها منه ويسجّل فقدها أو تلفها',
  'offboarding.manage': 'يبدأ إنهاء خدمة موظف وإخلاء طرفه ويتابعه',
  'settlement.edit': 'يضيف بنود تصفية نهاية الخدمة ويعدّلها ويحذفها',
  'settlement.approve': 'يعتمد التصفية ويقفلها',
  'reports.view': 'يفتح مركز التقارير (الأعداد والحضور والإجازات) — التقارير المالية محتاجة معاها «عرض مسيرات الرواتب»',
  'dashboard.view_all': 'يشوف لوحة التحكم الإدارية بأرقام نطاقه',
  'calendar.view_all': 'يشوف إجازات كل موظفي نطاقه في التقويم (من غيرها يشوف إجازاته هو بس)',
  'users.manage': 'ينشئ حسابات الدخول ويغيّر دورها وفرعها وكلمة مرورها ويعطّلها — لا يمنحها إلا مدير النظام',
  'roles.manage': 'ينشئ الأدوار ويعدّل صلاحيات كل دور، ويمنح أو يسحب صلاحية من مستخدم بعينه — لا يمنحها إلا مدير النظام',
  'settings.manage': 'يعدّل إعدادات النظام والكتالوجات والعطلات وقوالب الخطابات؛ وإعداد «لكل الشركة» بيتعدّل بس من حساب نطاقه «كل الفروع» — لا يمنحها إلا مدير النظام',
  'request_types.manage': 'ينشئ أنواع الطلبات ويعدّل حقولها وجمهورها',
  'approval_chains.manage': 'ينشئ دورات اعتماد الطلبات ويعدّل خطواتها',
}

const MODULE_OF_PERMISSION = new Map(
  PERMISSION_MODULES.flatMap((module) => module.permissions.map((key) => [key, module] as const))
)

// صف سجل الصلاحيات لشاشات الإدارة: التسمية والشرح والوحدة وهل منحها حصري لمدير النظام
export const permissionRegistry = () =>
  ALL_PERMISSIONS.map((key) => {
    const module = MODULE_OF_PERMISSION.get(key)
    return {
      key,
      labelAr: PERMISSIONS[key],
      description: PERMISSION_DESCRIPTIONS[key] ?? '',
      // صلاحية اتضافت للسجل ونسيها صاحبها من الوحدات تظهر تحت «أخرى» بدل ما تختفي من الشاشة
      group: module?.key ?? 'other',
      groupLabelAr: module?.labelAr ?? 'أخرى',
      superAdminOnly: SUPER_ADMIN_ONLY_GRANTS.includes(key),
    }
  })

// صلاحيات إدارية لا يمنحها إلا مدير النظام — منع التصعيد: من يملك users.manage
// أو roles.manage لا يصنع لنفسه أو لغيره مدير نظام فعلياً (تجاوز أو دور أو إسناد دور)
// + الصلاحيات الحساسة التي تغيّر الصافي أو تتخطى الحضور (SEC-05): إعادة فتح المسير
// وإلغاؤه، واعتماد استثناء الحضور بمستوييه، وتخفيض دقائق الإضافي — مدير الموارد
// البشرية (users.manage) لا يصنع حساباً أو دوراً أو تجاوزاً يحملها
export const SUPER_ADMIN_ONLY_GRANTS = [
  'users.manage', 'roles.manage', 'settings.manage',
  'attendance_exemption.approve_executive', 'attendance_exemption.approve',
  'payroll.reopen', 'payroll.cancel', 'overtime.adjust',
  // C8: عكس صرف مسير مصروف يعيد مستحقات وديونًا مالية — يحملها دور الموارد البشرية ولا يمنحها لغيره
  'payroll.reverse',
  // C6: تجاوز سقف السلفة وشطب رصيدها يغيّران الدين المستحق
  'loans.cap_override', 'loans.write_off',
  // C4: تجاوز سقف المكافأة يرفع المستحق فوق حد النوع
  'bonuses.exceed_cap',
  // C3 / الخطوة 26: تجاوز حدود الإعفاء المالي يُسقط خصومًا فوق الضوابط — يحملها دور الموارد البشرية ولا يمنحها لغيره
  'financial_exemption.override_limits',
  // B5: من يملك الرخصة مع الاحتساب والاعتماد يعتمد ما احتسبه — لا يُمنح لدور أو تجاوز إلا من مدير النظام
  'payroll.self_approval_licence',
  // سلسلة اعتماد المسير هي ضابط فصل المهام نفسه: من يضبطها يقرر مين يعتمد الرواتب — حامل users.manage
  // لا يصنع حسابًا أو دورًا أو تجاوزًا يحملها (وإلا يكتب نفسه معتمدًا وحيدًا عبر حساب وسيط)
  'payroll.chain_manage',
]

// ما يُضاف حديثاً منها (مقارنة بالسابق) → رسالة الرفض، أو null لو لا منح جديد
// ('*' المكتسبة حديثاً = كل الصلاحيات ومنها الثلاث — مخالفة أيضاً)
export const adminGrantViolation = (
  next: string[],
  prev: string[]
): string | null => {
  const added = next.filter(
    (p) => [...SUPER_ADMIN_ONLY_GRANTS, '*'].includes(p) && !hasPerm(prev, p)
  )
  return added.length > 0
    ? `منح ${added
        .map((p) => `«${PERMISSIONS[p] ?? 'كل الصلاحيات'}»`)
        .join(' و')} متاح لمدير النظام فقط`
    : null
}

// ===== الأدوار المدمجة كحزم (presets) — قابلة للتعديل من شاشة الأدوار =====
export const ROLE_PRESETS: Array<{
  code: string
  nameAr: string
  isSystem: boolean
  permissions: string[]
}> = [
  {
    code: 'super_admin',
    nameAr: 'مدير النظام',
    isSystem: true,
    permissions: ['*'], // يتخطى كل الفحوصات
  },
  {
    code: 'hr_manager',
    nameAr: 'مدير الموارد البشرية',
    isSystem: true,
    permissions: [
      'employees.view', 'employees.create', 'employees.edit', 'employees.archive',
      'org.manage', 'users.manage',
      'requests.view_all', 'requests.create_on_behalf', 'approve.hr',
      'attendance.view_all', 'attendance.manage', 'attendance.sync', 'overtime.confirm', 'overtime.adjust',
      'leaves.view_all', 'leaves.revoke', 'leave_balances.manage',
      'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.policy.manage',
      // SEC2 (الخطوة 9): إعادة فتح المسير المعتمد وإلغاء المسودة لنفس دور الاعتماد، بسبب وحدث؛ ولا يمررهما لغيره (SUPER_ADMIN_ONLY_GRANTS)
      'payroll.reopen', 'payroll.cancel',
      // C8 / الخطوة 31: إنشاء مسير عكس لمسير مصروف (ترحيل 20260915_032_c8 يضيفها للدور القائم)؛ من ينشئه لا يعتمده (فصل مهام)
      'payroll.reverse',
      // C6: الشطب (loans.write_off) لا يُمنح افتراضيًا — صلاحية مستقلة (AD-13)
      'loans.policies', 'loans.exceptional', 'loans.cap_override', 'loans.repay',
      // C2: الخصومات المصنفة (ترحيل 20260914_*_c2_typed_deductions يضيفها للدور القائم)
      'deductions.view', 'deductions.approve', 'deductions.manage',
      // C4: المكافآت (ترحيل 20260914_026_c4_bonuses يضيفها للدور القائم)؛ تجاوز السقف bonuses.exceed_cap لا يُمنح افتراضيًا
      'bonuses.view', 'bonuses.approve', 'bonuses.manage',
      // C3 / الخطوة 26: الإعفاء المالي (ترحيل 20260915_031_c3_financial_exemptions يضيفها للدور القائم)؛ المانح لا يعتمد ما منحه (فصل مهام في الخدمة)
      'financial_exemption.view', 'financial_exemption.grant', 'financial_exemption.approve', 'financial_exemption.override_limits',
      'custody.assign', 'documents.manage',
      'offboarding.manage', 'settlement.edit', 'settlement.approve',
      'reports.view', 'dashboard.view_all', 'calendar.view_all',
      'settings.manage', 'request_types.manage', 'approval_chains.manage',
      'candidates.manage', 'transfers.view',
      // خطة المراجعة 24: طلب استثناء الحضور واعتماده وإنهاؤه — لا يعتمد أحد ما أنشأه (فصل مهام في الخدمة).
      // الاعتماد التنفيذي approve_executive يبقى لمدير النظام (ترحيل 20260914_*_c1_attendance_exemption_roles)
      'attendance_exemption.view', 'attendance_exemption.manage', 'attendance_exemption.approve',
    ],
  },
  {
    code: 'branch_manager',
    nameAr: 'مدير فرع',
    isSystem: true,
    permissions: [
      'employees.view',
      'requests.view_all',
      'attendance.view_all', 'attendance.manage', 'overtime.confirm',
      'leaves.view_all',
      'custody.assign',
      'reports.view', 'dashboard.view_all', 'calendar.view_all',
      'transfers.view',
      // يطلب استثناء الحضور لموظفي فرعه ويتابعه؛ القرار للموارد البشرية
      'attendance_exemption.view', 'attendance_exemption.manage',
      // C2: يتابع الخصومات المصنفة لفرعه؛ الإنشاء بعلاقته الهيكلية والقرار للموارد البشرية
      'deductions.view',
      // C4: يتابع مكافآت فرعه؛ الاقتراح بعلاقته الهيكلية والقرار للموارد البشرية
      'bonuses.view',
      // C3: يتابع الإعفاءات المالية لفرعه؛ منحه كمدير قسم هيكلي باعتماد الموارد البشرية
      'financial_exemption.view',
    ],
  },
  {
    code: 'employee',
    nameAr: 'موظف',
    isSystem: true,
    // الموظف = خدمة ذاتية فقط — endpoints الذاتية لا تحتاج صلاحيات
    permissions: [],
  },
  // ===== أدوار تشغيلية (قرارات المالك 22 سبتمبر — تدقيق الأدوار ROLES_AUDIT.md) =====
  // غير نظامية: تتعدل وتتعطل من شاشة الأدوار، والبذر يدرج الناقص منها فقط ولا يلمس صفًا قائمًا.
  // الصفوف القائمة في قاعدة الشركة يعدّلها ترحيل 20260922_064 فقط لو لسه مطابقة للحزمة القديمة بالحرف.
  {
    // D1: يحتسب ويدير المسيرات — لا يعتمد ولا يصرف (فصل المهام): بلا payroll.approve ولا payroll.pay ولا payroll.disburse
    code: 'payroll_manager',
    nameAr: 'مسؤول الرواتب',
    isSystem: false,
    permissions: [
      'bonuses.manage', 'dashboard.view_all', 'deductions.manage', 'deductions.view', 'documents.manage',
      'employees.view', 'payroll.calculate', 'payroll.view', 'reports.view', 'requests.create_on_behalf',
    ],
  },
  {
    // D2: «قراءة فقط» لا يكتب — بلا بصمات يدوية ولا إعادة حساب حضور ولا عهد ولا مرشحين ولا مستندات،
    // وبلا payroll.view (كشف البنك بالحسابات البنكية مفتوح بها)
    code: 'read_only',
    nameAr: 'قراءة فقط',
    isSystem: false,
    permissions: [
      'attendance.view_all', 'dashboard.view_all', 'deductions.view', 'employees.view',
      'leaves.view_all', 'reports.view', 'requests.view_all',
    ],
  },
  {
    // D4: مدخل البيانات يعيّن ويعدّل ولا يؤرشف
    code: 'data_entry',
    nameAr: 'مدخل بيانات',
    isSystem: false,
    permissions: ['documents.manage', 'employees.create', 'employees.edit', 'employees.view'],
  },
  {
    // يسجّل الأصل ويسلّم العهدة ويستلمها وينقلها ويعتمد خطوة أمين العهدة — ولا شيء غير ذلك:
    // لا مال ولا ملفات موظفين (منتقي الموظف من الدليل المختصر بلا employees.view) ولا حضور ولا إعدادات
    code: 'asset_officer',
    nameAr: 'مسؤول الأصول',
    isSystem: false,
    permissions: ['custody.assign', 'approve.custody'],
  },
  {
    // قراءة فقط في وحدات الموارد البشرية: لا يعدّل ولا يلغي ولا يعتمد، ولا يرى الرواتب ولا الخصومات والمكافآت
    code: 'hr_officer',
    nameAr: 'مسؤول موارد بشرية',
    isSystem: false,
    permissions: [
      'employees.view', 'requests.view_all',
      'attendance.view_all', 'attendance_exemption.view',
      'leaves.view_all', 'calendar.view_all',
      'dashboard.view_all', 'reports.view', 'transfers.view',
    ],
  },
  {
    // يرى المسيرات ويعلّم صرف كل موظف (تم / لم يتم) — لا يحتسب ولا يعتمد ولا يقفل الصرف ولا يعدّل رقمًا
    code: 'payroll_disburser',
    nameAr: 'مسؤول صرف الرواتب',
    isSystem: false,
    permissions: ['payroll.view', 'payroll.disburse'],
  },
]

// الحزم اللي اتشحنت قبل قرارات 22 سبتمبر (أنشأها مستورد النظام القديم users-assets.ts من أدوار logic-leap،
// مرتبة أبجديًا بالحرف زي ما المستورد بيكتبها). مرجع ترحيل 20260922_064: الصف يتعدّل فقط لو لسه مطابق لها.
export const LEGACY_SHIPPED_ROLE_PRESETS: Record<string, string[]> = {
  payroll_manager: [
    'bonuses.manage', 'dashboard.view_all', 'deductions.manage', 'deductions.view', 'documents.manage', 'employees.view',
    'payroll.approve', 'payroll.calculate', 'payroll.pay', 'payroll.view', 'reports.view', 'requests.create_on_behalf',
  ],
  read_only: [
    'attendance.manage', 'attendance.view_all', 'candidates.manage', 'custody.assign', 'dashboard.view_all', 'deductions.view',
    'documents.manage', 'employees.view', 'leaves.view_all', 'payroll.view', 'reports.view', 'requests.view_all',
  ],
  data_entry: ['documents.manage', 'employees.archive', 'employees.create', 'employees.edit', 'employees.view'],
}

// حساب الصلاحيات النهائية
export function effectivePermissions(
  rolePerms: string[],
  grants: string[],
  revokes: string[]
): string[] {
  if (rolePerms.includes('*')) return ['*']
  const set = new Set(rolePerms)
  for (const g of grants) set.add(g)
  for (const r of revokes) set.delete(r)
  return [...set]
}

export const hasPerm = (perms: string[] | undefined, perm: string): boolean =>
  !!perms && (perms.includes('*') || perms.includes(perm))
