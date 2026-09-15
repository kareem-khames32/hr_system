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
]

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
