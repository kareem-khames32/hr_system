'use client'

import {
  UserPlus,
  Clock,
  Calendar,
  FileText,
  Wallet,
  Settings,
  Users,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { can } from '@/lib/api'

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  // الصلاحيات المطلوبة لفتح الشاشة وتنفيذ الإجراء (كلها لازمة) — بلا قيمة = متاح لكل موظف
  perms?: string[]
  color: string
  bgColor: string
}

const quickActions: QuickAction[] = [
  {
    id: '1',
    label: 'إضافة موظف',
    icon: <UserPlus size={22} />,
    href: '/employees/add',
    // حارس /employees/add = employees.create وحدها (منتقي المدير من الدليل المختصر)
    perms: ['employees.create'],
    color: 'text-primary-600',
    bgColor: 'bg-primary-50 hover:bg-primary-100',
  },
  {
    id: '2',
    label: 'تسجيل حضور',
    icon: <Clock size={22} />,
    href: '/attendance',
    perms: ['attendance.view_all'],
    color: 'text-success-600',
    bgColor: 'bg-success-50 hover:bg-success-100',
  },
  {
    // شاشة التقديم نفسها (لا قائمة الإجازات) — متاحة لكل موظف
    id: '3',
    label: 'طلب إجازة',
    icon: <Calendar size={22} />,
    href: '/leaves/request',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50 hover:bg-warning-100',
  },
  {
    id: '4',
    label: 'مسير الرواتب',
    icon: <Wallet size={22} />,
    href: '/payroll',
    perms: ['payroll.view'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    id: '5',
    label: 'التقارير',
    icon: <BarChart3 size={22} />,
    href: '/reports',
    perms: ['reports.view'],
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100',
  },
  {
    id: '6',
    label: 'قائمة الموظفين',
    icon: <Users size={22} />,
    href: '/employees',
    perms: ['employees.view'],
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
  },
  {
    id: '7',
    label: 'قوالب المستندات',
    icon: <FileText size={22} />,
    href: '/settings/document-templates',
    perms: ['settings.manage'],
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
  },
  {
    id: '8',
    label: 'الإعدادات',
    icon: <Settings size={22} />,
    href: '/settings',
    perms: ['settings.manage'],
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 hover:bg-gray-200',
  },
]

export default function QuickActions() {
  // الاختصارات المسموحة فقط — لا رابط ينتهي بشاشة «غير مصرح»
  const visible = quickActions.filter((a) => !a.perms || a.perms.every((p) => can(p)))
  if (visible.length === 0) return null

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-gray-800 mb-6">الوصول السريع</h3>
      <div className="grid grid-cols-4 gap-4">
        {visible.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all ${action.bgColor}`}
          >
            <div className={action.color}>{action.icon}</div>
            <span className="text-sm font-medium text-gray-700 text-center">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
