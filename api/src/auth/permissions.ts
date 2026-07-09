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
  'overtime.confirm': 'تأكيد الأوفرتايم المكتشف',
  // الإجازات
  'leaves.view_all': 'سجل إجازات النطاق وأرصدته',
  'leaves.revoke': 'إلغاء إجازة معتمدة (استرجاع الرصيد وإعادة حساب الحضور)',
  'leave_balances.manage': 'الترحيل السنوي وإدارة الأرصدة',
  // الرواتب
  'payroll.view': 'عرض مسيرات الرواتب',
  'payroll.calculate': 'احتساب المسير',
  'payroll.approve': 'اعتماد المسير',
  'payroll.pay': 'صرف المسير',
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
      'attendance.view_all', 'attendance.manage', 'attendance.sync', 'overtime.confirm',
      'leaves.view_all', 'leaves.revoke', 'leave_balances.manage',
      'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay',
      'custody.assign', 'documents.manage',
      'offboarding.manage', 'settlement.edit', 'settlement.approve',
      'reports.view', 'dashboard.view_all', 'calendar.view_all',
      'settings.manage', 'request_types.manage', 'approval_chains.manage',
      'candidates.manage', 'transfers.view',
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
