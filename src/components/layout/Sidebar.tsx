'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import clsx from 'clsx'

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  children?: { label: string; href: string }[]
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: <LayoutDashboard size={20} />,
    href: '/',
  },
  {
    id: 'employees',
    label: 'إدارة الموظفين',
    icon: <Users size={20} />,
    children: [
      { label: 'قائمة الموظفين', href: '/employees' },
      { label: 'إضافة موظف', href: '/employees/add' },
      { label: 'الهيكل التنظيمي', href: '/employees/org-chart' },
      { label: 'إدارة العقود', href: '/employees/contracts' },
      { label: 'المستندات', href: '/employees/documents' },
      { label: 'الموظفين المؤرشفين', href: '/employees/archived' },
    ],
  },
  {
    id: 'calendar',
    label: 'التقويم الموحد',
    icon: <Calendar size={20} />,
    href: '/calendar',
  },
  {
    id: 'attendance',
    label: 'الحضور والانصراف',
    icon: <Clock size={20} />,
    children: [
      { label: 'سجل الحضور', href: '/attendance' },
      { label: 'الجدول الأسبوعي', href: '/attendance/weekly-schedule' },
      { label: 'الورديات', href: '/attendance/shifts' },
      { label: 'الأذونات', href: '/attendance/permissions' },
      { label: 'العمل الإضافي', href: '/attendance/overtime' },
      { label: 'الإدخال اليدوي', href: '/attendance/manual-entry' },
      { label: 'أجهزة البصمة', href: '/attendance/devices' },
      { label: 'تقارير الحضور', href: '/attendance/reports' },
    ],
  },
  {
    id: 'leaves',
    label: 'الإجازات',
    icon: <Calendar size={20} />,
    children: [
      { label: 'طلبات الإجازات', href: '/leaves' },
      { label: 'طلب إجازة', href: '/leaves/request' },
      { label: 'رصيد الإجازات', href: '/leaves/balance' },
      { label: 'تقويم الإجازات', href: '/leaves/calendar' },
      { label: 'الإجازات الرسمية', href: '/leaves/holidays' },
      { label: 'أنواع الإجازات', href: '/leaves/types' },
    ],
  },
  {
    id: 'payroll',
    label: 'الرواتب',
    icon: <Wallet size={20} />,
    children: [
      { label: 'مسير الرواتب', href: '/payroll' },
      { label: 'المكافآت', href: '/payroll/bonuses' },
      { label: 'الخصومات', href: '/payroll/deductions' },
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
      { label: 'الإعدادات العامة', href: '/settings' },
      { label: 'الفروع', href: '/settings/branches' },
      { label: 'الأقسام والإدارات', href: '/settings/departments' },
      { label: 'الفرق', href: '/settings/teams' },
      { label: 'المسميات الوظيفية', href: '/settings/job-titles' },
      { label: 'الدرجات الوظيفية', href: '/settings/grades' },
      { label: 'أيام العمل', href: '/settings/work-days' },
      { label: 'سياسات الإجازات والأوفرتايم', href: '/settings/policies' },
      { label: 'الاعتمادات والموافقات', href: '/settings/approvals' },
      { label: 'أنواع المستندات', href: '/settings/documents' },
      { label: 'قوالب المستندات', href: '/settings/document-templates' },
      { label: 'المستخدمين', href: '/settings/users' },
      { label: 'الأدوار والصلاحيات', href: '/settings/roles' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['employees'])

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
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className={clsx('sidebar-item', isActive(item.href) && 'active')}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
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

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
            أ
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800 text-sm">أحمد محمد</p>
            <p className="text-xs text-gray-400">مدير الموارد البشرية</p>
          </div>
          <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <LogOut size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  )
}
