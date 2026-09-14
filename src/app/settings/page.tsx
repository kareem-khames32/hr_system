'use client'

import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { can } from '@/lib/api'
import {
  ArrowLeft, Award, Briefcase, Building2, CalendarDays, CalendarClock,
  Clock, FileCheck, FileText, Fingerprint, GitBranch, Layers3,
  Package, Settings2, ShieldCheck, Users, UsersRound, Wallet,
  type LucideIcon,
} from 'lucide-react'

interface SettingsLink {
  title: string
  description: string
  href: string
  permission: string
  icon: LucideIcon
}

const groups: { title: string; description: string; links: SettingsLink[] }[] = [
  {
    title: 'الشركة والهيكل الوظيفي',
    description: 'البيانات التي تربط الموظفين بفروع الشركة وفرقها.',
    links: [
      { title: 'بيانات الشركة', description: 'الاسم والشعار وبيانات التواصل المستخدمة في المستندات.', href: '/settings/company', permission: 'settings.manage', icon: Building2 },
      { title: 'الفروع', description: 'الفروع وأيام العطلة ومراكز التكلفة المرتبطة بها.', href: '/settings/branches', permission: 'org.manage', icon: GitBranch },
      { title: 'الأقسام', description: 'الأقسام والتسلسل الإداري داخل كل فرع.', href: '/settings/departments', permission: 'org.manage', icon: Layers3 },
      { title: 'الفرق', description: 'فرق العمل والأقسام التي تتبعها.', href: '/settings/teams', permission: 'org.manage', icon: UsersRound },
      { title: 'المسميات الوظيفية', description: 'المسميات المتاحة في ملفات الموظفين.', href: '/settings/job-titles', permission: 'settings.manage', icon: Briefcase },
      { title: 'الدرجات الوظيفية', description: 'الدرجات وحدود الرواتب الخاصة بها.', href: '/settings/grades', permission: 'settings.manage', icon: Award },
      { title: 'مراكز التكلفة', description: 'المراكز المستخدمة لتوزيع تكاليف الموظفين.', href: '/settings/cost-centers', permission: 'settings.manage', icon: Wallet },
    ],
  },
  {
    title: 'السياسات والحضور والإجازات',
    description: 'قواعد الاستحقاق والحساب ومواعيد العمل.',
    links: [
      { title: 'سياسات النظام', description: 'الإجازات والحضور والمسير وعملة النظام وإعداد استقبال البصمات.', href: '/settings/policies', permission: 'settings.manage', icon: Settings2 },
      { title: 'سياسات الرواتب', description: 'تصنيفات الخصومات وترتيب تحصيلها لكل نسخة سياسة.', href: '/payroll/policies', permission: 'payroll.view', icon: Wallet },
      { title: 'أيام العمل', description: 'جداول أيام العمل والراحة التي تُسند للموظفين.', href: '/settings/work-days', permission: 'settings.manage', icon: CalendarClock },
      { title: 'الورديات', description: 'مواعيد الحضور والانصراف وسماحية التأخير والعمل الإضافي.', href: '/attendance/shifts', permission: 'settings.manage', icon: Clock },
      { title: 'أجهزة البصمة', description: 'الأجهزة التابعة للفروع ومزامنة سجلات الحضور.', href: '/attendance/devices', permission: 'attendance.sync', icon: Fingerprint },
      { title: 'أنواع الإجازات', description: 'الأنواع المتاحة وقواعد استحقاق كل نوع.', href: '/leaves/types', permission: 'settings.manage', icon: CalendarDays },
      { title: 'العطلات الرسمية', description: 'العطلات التي تدخل في احتساب الحضور والإجازات.', href: '/leaves/holidays', permission: 'settings.manage', icon: CalendarDays },
      { title: 'أنواع الأذونات', description: 'أنواع أذونات الحضور والانصراف وحدودها.', href: '/settings/permission-types', permission: 'settings.manage', icon: Clock },
    ],
  },
  {
    title: 'الصلاحيات والطلبات والسجلات',
    description: 'إدارة الوصول ومسارات الموافقة والبيانات المرجعية.',
    links: [
      { title: 'المستخدمون', description: 'حسابات الدخول وربطها بالموظفين والفروع.', href: '/settings/users', permission: 'users.manage', icon: Users },
      { title: 'الأدوار والصلاحيات', description: 'الصلاحيات الفعلية الممنوحة لكل دور.', href: '/settings/roles', permission: 'roles.manage', icon: ShieldCheck },
      { title: 'مسارات الموافقات', description: 'مراحل الاعتماد والجهات المسؤولة وشروط الانتقال.', href: '/settings/approvals', permission: 'approval_chains.manage', icon: FileCheck },
      { title: 'أنواع الطلبات', description: 'نماذج الطلبات والحقول المطلوبة لكل نوع.', href: '/settings/request-types', permission: 'request_types.manage', icon: FileText },
      { title: 'أنواع المستندات', description: 'المستندات التي تُرفق بملفات الموظفين.', href: '/settings/documents', permission: 'settings.manage', icon: FileText },
      { title: 'قوالب المستندات', description: 'قوالب العقود والإقرارات ونماذج الموارد البشرية لإصدارها وحفظها وطباعتها.', href: '/settings/document-templates', permission: 'settings.manage', icon: FileText },
      { title: 'قوالب الخطابات', description: 'صياغة خطابات طلبات الموظفين ونشرها وربطها بالموافقات.', href: '/settings/letter-templates', permission: 'settings.manage', icon: FileText },
      { title: 'سجل الأصول', description: 'الأصول المتاحة وحالتها وبياناتها.', href: '/settings/asset-types', permission: 'custody.assign', icon: Package },
    ],
  },
]

// Render only after MainLayout checks the browser account and route permission.
function SettingsDirectory() {
  const visibleGroups = groups
    .map((group) => ({ ...group, links: group.links.filter((link) => can(link.permission)) }))
    .filter((group) => group.links.length > 0)

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
          <Settings2 size={25} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
          <p className="text-gray-500 mt-1">اختر القسم المطلوب. تظهر الأقسام المتاحة لصلاحيات حسابك، وتُحفظ التغييرات من داخل كل قسم.</p>
        </div>
      </div>
      {visibleGroups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">{group.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.links.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href} className="group card flex items-start gap-3 border border-transparent hover:border-primary-200 hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-600 flex items-center justify-center shrink-0">
                    <Icon size={21} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 group-hover:text-primary-700">{link.title}</h3>
                    <p className="text-sm text-gray-500 leading-6 mt-1">{link.description}</p>
                  </div>
                  <ArrowLeft size={17} className="text-gray-400 group-hover:text-primary-600 shrink-0 mt-1" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      ))}
      {visibleGroups.length === 0 && <p className="card text-gray-500">لا توجد أقسام إعدادات متاحة لحسابك.</p>}
    </div>
  )
}

export default function SettingsPage() {
  return <MainLayout><SettingsDirectory /></MainLayout>
}
