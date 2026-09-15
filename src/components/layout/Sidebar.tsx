'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  can,
  clearSession,
  fetchInbox,
  getCurrentUser,
  type CurrentUser,
} from '@/lib/api'
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Wallet,
  UserPlus,
  Target,
  GraduationCap,
  FileText,
  Settings,
  ChevronDown,
  Building2,
  LogOut,
  Bell,
  ClipboardList,
  Package,
  FolderOpen,
  UserCircle,
  Inbox,
  UserMinus,
  Gift,
} from 'lucide-react'
import clsx from 'clsx'

interface ChildItem {
  label: string
  href: string
  // الصلاحية المطلوبة لظهور العنصر — بدونها العنصر مفتوح
  perm?: string
}

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  perm?: string
  children?: ChildItem[]
  badge?: number
}

// ===== الشاشات الإدارية — كل عنصر مربوط بصلاحيته من سجل الصلاحيات =====
const adminMenuDefs: MenuItem[] = [
  {
    id: 'requests-console',
    label: 'لوحة الطلبات (HR)',
    icon: <ClipboardList size={20} />,
    href: '/requests-console',
    perm: 'requests.view_all',
  },
  {
    id: 'employees',
    label: 'إدارة الموظفين',
    icon: <Users size={20} />,
    children: [
      { label: 'قائمة الموظفين', href: '/employees', perm: 'employees.view' },
      { label: 'إضافة موظف', href: '/employees/add', perm: 'employees.create' },
      { label: 'تهيئة الموظفين الجدد', href: '/employees/onboarding', perm: 'employees.view' },
      { label: 'الهيكل التنظيمي', href: '/employees/org-chart', perm: 'employees.view' },
      { label: 'إدارة العقود', href: '/employees/contracts', perm: 'employees.view' },
      { label: 'المستندات', href: '/employees/documents', perm: 'documents.manage' },
      { label: 'إنشاء مستند', href: '/employees/documents/create', perm: 'documents.manage' },
      { label: 'سجل العهد', href: '/employees/custody', perm: 'custody.assign' },
      { label: 'لوج النقل', href: '/employees/transfers', perm: 'transfers.view' },
      { label: 'المؤرشفون ومنتهو الخدمة', href: '/employees/archived', perm: 'employees.view' },
    ],
  },
  {
    id: 'offboarding',
    label: 'إنهاء الخدمة',
    icon: <UserMinus size={20} />,
    href: '/offboarding',
    perm: 'offboarding.manage',
  },
  {
    id: 'attendance',
    label: 'الحضور والانصراف',
    icon: <Clock size={20} />,
    // الصلاحية لكل عنصر (مطابقة لحارس المسارات): الورديات كتالوج إعدادات والأجهزة للمزامنة
    children: [
      { label: 'سجل الحضور', href: '/attendance', perm: 'attendance.view_all' },
      { label: 'الجدول الأسبوعي', href: '/attendance/weekly-schedule', perm: 'attendance.view_all' },
      { label: 'الورديات', href: '/attendance/shifts', perm: 'settings.manage' },
      { label: 'الأذونات', href: '/attendance/permissions', perm: 'attendance.view_all' },
      { label: 'استثناء الحضور', href: '/attendance/exemptions', perm: 'attendance_exemption.view' },
      { label: 'العمل الإضافي', href: '/attendance/overtime', perm: 'attendance.view_all' },
      { label: 'الإدخال اليدوي', href: '/attendance/manual-entry', perm: 'attendance.view_all' },
      { label: 'أجهزة البصمة', href: '/attendance/devices', perm: 'attendance.sync' },
      { label: 'الكشف الشهري', href: '/attendance/monthly-sheet', perm: 'attendance.view_all' },
      { label: 'تقارير الحضور', href: '/attendance/reports', perm: 'attendance.view_all' },
    ],
  },
  {
    id: 'leaves',
    label: 'الإجازات',
    icon: <Calendar size={20} />,
    // العطلات وأنواع الإجازات كتالوجات إعدادات (كتابتها وقراءة الأنواع settings.manage)
    children: [
      { label: 'سجل الإجازات المعتمدة', href: '/leaves', perm: 'leaves.view_all' },
      { label: 'طلب إجازة', href: '/leaves/request', perm: 'leaves.view_all' },
      { label: 'رصيد الإجازات', href: '/leaves/balance', perm: 'leaves.view_all' },
      { label: 'تقويم الإجازات', href: '/leaves/calendar', perm: 'leaves.view_all' },
      { label: 'العطلات الرسمية', href: '/leaves/holidays', perm: 'settings.manage' },
      { label: 'أنواع الإجازات', href: '/leaves/types', perm: 'settings.manage' },
    ],
  },
  {
    id: 'payroll',
    label: 'الرواتب',
    icon: <Wallet size={20} />,
    perm: 'payroll.view',
    children: [
      { label: 'مسير الرواتب', href: '/payroll' },
      { label: 'سياسات الرواتب', href: '/payroll/policies' },
      { label: 'المكافآت', href: '/payroll/bonuses' },
      { label: 'الخصومات', href: '/payroll/deductions' },
      // الخطوة 26: الإعفاءات المالية (قائمة واعتماد وتقرير حوكمة)
      { label: 'الإعفاءات المالية', href: '/payroll/exemptions' },
      { label: 'قسائم الراتب', href: '/payroll/payslips' },
      { label: 'معادلات الرواتب', href: '/payroll/formulas' },
      { label: 'البدلات', href: '/payroll/allowances' },
      { label: 'السلف والقروض', href: '/payroll/loans' },
      { label: 'التأمينات (GOSI)', href: '/payroll/gosi' },
      { label: 'التقارير المالية', href: '/payroll/reports' },
    ],
  },
  {
    id: 'recruitment',
    label: 'التوظيف',
    icon: <UserPlus size={20} />,
    perm: 'candidates.manage',
    children: [
      { label: 'الوظائف الشاغرة', href: '/recruitment' },
      { label: 'المتقدمين', href: '/recruitment/applicants' },
      { label: 'المقابلات', href: '/recruitment/interviews' },
      { label: 'عروض العمل', href: '/recruitment/offers' },
      { label: 'إضافة وظيفة', href: '/recruitment/add' },
    ],
  },
  {
    id: 'performance',
    label: 'إدارة الأداء',
    icon: <Target size={20} />,
    perm: 'employees.view',
    children: [
      { label: 'التقييمات', href: '/performance' },
      { label: 'تقييم جديد', href: '/performance/new' },
      { label: 'الأهداف', href: '/performance/goals' },
      { label: 'دورات التقييم', href: '/performance/cycles' },
      { label: 'النماذج', href: '/performance/templates' },
    ],
  },
  {
    id: 'training',
    label: 'التدريب والتطوير',
    icon: <GraduationCap size={20} />,
    perm: 'employees.view',
    children: [
      { label: 'الدورات التدريبية', href: '/training' },
      { label: 'دوراتي', href: '/training/my-courses' },
      { label: 'إضافة دورة', href: '/training/add' },
      { label: 'الشهادات', href: '/training/certificates' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: <FileText size={20} />,
    perm: 'reports.view',
    children: [
      { label: 'لوحة التقارير', href: '/reports' },
      { label: 'تقارير مخصصة', href: '/reports/custom' },
    ],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: <Settings size={20} />,
    children: [
      { label: 'الإعدادات العامة', href: '/settings', perm: 'settings.manage' },
      { label: 'الفروع', href: '/settings/branches', perm: 'org.manage' },
      { label: 'الأقسام والإدارات', href: '/settings/departments', perm: 'org.manage' },
      { label: 'الفرق', href: '/settings/teams', perm: 'org.manage' },
      { label: 'المسميات الوظيفية', href: '/settings/job-titles', perm: 'settings.manage' },
      { label: 'الدرجات الوظيفية', href: '/settings/grades', perm: 'settings.manage' },
      { label: 'مراكز التكلفة', href: '/settings/cost-centers', perm: 'settings.manage' },
      { label: 'أيام العمل', href: '/settings/work-days', perm: 'settings.manage' },
      { label: 'أنواع الأذونات', href: '/settings/permission-types', perm: 'settings.manage' },
      { label: 'سياسات الإجازات والأوفرتايم', href: '/settings/policies', perm: 'settings.manage' },
      { label: 'الاعتمادات والموافقات', href: '/settings/approvals', perm: 'approval_chains.manage' },
      { label: 'بانِي الطلبات', href: '/settings/request-types', perm: 'request_types.manage' },
      { label: 'سجل الأصول', href: '/settings/asset-types', perm: 'custody.assign' },
      { label: 'أنواع المستندات', href: '/settings/documents', perm: 'settings.manage' },
      { label: 'قوالب المستندات', href: '/settings/document-templates', perm: 'settings.manage' },
      { label: 'قوالب الخطابات', href: '/settings/letter-templates', perm: 'settings.manage' },
      { label: 'المستخدمين', href: '/settings/users', perm: 'users.manage' },
      { label: 'الأدوار والصلاحيات', href: '/settings/roles', perm: 'roles.manage' },
    ],
  },
]

// أسماء الأدوار للعرض
const roleLabels: Record<string, string> = {
  super_admin: 'مدير النظام',
  hr_manager: 'مدير الموارد البشرية',
  branch_manager: 'مدير فرع',
  employee: 'موظف',
}

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['employees'])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [inboxError, setInboxError] = useState(false)
  const [inboxRevision, setInboxRevision] = useState(0)
  const [inboxCount, setInboxCount] = useState<number>(0)

  // يُقرأ بعد الـ mount — الجلسة في التخزين المحلي
  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    if (user) {
      // «بانتظار موافقتي» تظهر لغير الموظف دائماً، وللموظف عندما يكون معتمِداً فعلياً
      fetchInbox()
        .then((rows) => { setInboxCount(rows.length); setInboxError(false) })
        .catch(() => setInboxError(true))
    }
  }, [inboxRevision])

  // القائمة تُبنى من صلاحيات المستخدم الحالي — الفرض الحقيقي في الباك إند
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!currentUser) return []

    // العناصر الإدارية المسموحة: المجموعة تظهر إذا بقي فيها عنصر واحد على الأقل
    const adminItems: MenuItem[] = []
    for (const item of adminMenuDefs) {
      if (item.perm && !can(item.perm)) continue
      if (item.children) {
        const visibleChildren = item.children.filter((c) => !c.perm || can(c.perm))
        if (visibleChildren.length === 0) continue
        adminItems.push({ ...item, children: visibleChildren })
      } else {
        adminItems.push(item)
      }
    }

    const isPrivileged = adminItems.length > 0
    const showInbox = currentUser.role !== 'employee' || inboxCount > 0 || inboxError

    // بورتال الموظف — يظهر للجميع (كل مستخدم موظف أيضاً)
    const portalItems: MenuItem[] = [
      {
        id: 'dashboard',
        label: isPrivileged ? 'لوحة التحكم' : 'لوحتي',
        icon: <LayoutDashboard size={20} />,
        href: '/',
      },
      {
        id: 'my-requests',
        label: 'طلباتي',
        icon: <FileText size={20} />,
        href: '/requests',
      },
      ...(showInbox
        ? [
            {
              id: 'approvals-inbox',
              label: 'بانتظار موافقتي',
              icon: <Inbox size={20} />,
              href: '/approvals-inbox',
              badge: inboxCount,
            } satisfies MenuItem,
          ]
        : []),
      { id: 'my-attendance', label: 'حضوري', icon: <Clock size={20} />, href: '/my/attendance' },
      { id: 'my-leaves', label: 'إجازاتي وأرصدتي', icon: <Calendar size={20} />, href: '/my/leaves' },
      { id: 'my-payslips', label: 'قسائم راتبي', icon: <Wallet size={20} />, href: '/my/payslips' },
      { id: 'my-loans', label: 'سلفي', icon: <Wallet size={20} />, href: '/my/loans' },
      // الخطوة 25: الخصومات المصنفة عليّ، ومساحة المدير لإنشاء خصومات فريقه ومتابعة اعتمادها
      { id: 'my-deductions', label: 'خصوماتي', icon: <ClipboardList size={20} />, href: '/my/deductions' },
      // الخطوة 27: المكافآت المقترحة لي بحالتها، ومساحة المدير لاقتراح مكافآت مرؤوسيه
      { id: 'my-bonuses', label: 'مكافآتي', icon: <Gift size={20} />, href: '/my/bonuses' },
      // الخطوة 26: الإعفاءات المالية عليّ بسببها، ومساحة مدير القسم لمنح إعفاء خصومات حضور قسمه
      { id: 'my-exemptions', label: 'إعفاءاتي', icon: <ClipboardList size={20} />, href: '/my/exemptions' },
      { id: 'my-custody', label: 'عهدي', icon: <Package size={20} />, href: '/my/custody' },
      { id: 'my-documents', label: 'مستنداتي', icon: <FolderOpen size={20} />, href: '/my/documents' },
      { id: 'profile', label: 'ملفي الشخصي', icon: <UserCircle size={20} />, href: '/profile' },
      { id: 'notifications', label: 'الإشعارات', icon: <Bell size={20} />, href: '/notifications' },
      { id: 'calendar', label: 'التقويم', icon: <Calendar size={20} />, href: '/calendar' },
    ]

    return [...portalItems, ...adminItems]
  }, [currentUser, inboxCount, inboxError])

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const isActive = (href: string) => pathname === href
  const isChildActive = (children?: { href: string }[]) =>
    children?.some((child) => pathname === child.href)

  return (
    <aside className="fixed right-0 top-0 h-screen w-72 bg-white border-l border-gray-100 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">نظام HR</h1>
            <p className="text-xs text-gray-400">إدارة الموارد البشرية</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {inboxError && <div role="alert" className="text-xs text-amber-700 p-2">تعذر تحديث صندوق الموافقات. <button type="button" className="underline" onClick={() => setInboxRevision(value => value + 1)}>إعادة المحاولة</button></div>}
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className={clsx('sidebar-item', isActive(item.href) && 'active')}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
                {(item.badge ?? 0) > 0 && (
                  <span
                    className={clsx(
                      'mr-auto text-xs font-bold px-2 py-0.5 rounded-full',
                      isActive(item.href)
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-500 text-white'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ) : (
              <>
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className={clsx(
                    'sidebar-item w-full justify-between',
                    isChildActive(item.children) && 'bg-primary-50 text-primary-600'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={clsx(
                      'transition-transform duration-200',
                      expandedItems.includes(item.id) && 'rotate-180'
                    )}
                  />
                </button>
                {expandedItems.includes(item.id) && item.children && (
                  <div className="mr-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'block px-4 py-2.5 rounded-xl text-sm transition-all',
                          isActive(child.href)
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* المستخدم الحالي من الجلسة الحقيقية + خروج فعلي */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
            {currentUser?.displayName?.charAt(0) ?? '؟'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800 text-sm">
              {currentUser?.displayName ?? '—'}
            </p>
            <p className="text-xs text-gray-400">
              {roleLabels[currentUser?.role ?? ''] ?? currentUser?.role ?? ''}
            </p>
          </div>
          <button
            onClick={() => {
              clearSession()
              window.location.href = '/login'
            }}
            title="تسجيل الخروج"
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <LogOut size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  )
}
