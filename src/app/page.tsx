'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { can } from '@/lib/api'
import { RecentActivities, PendingApprovals, QuickActions, UpcomingEvents } from '@/components/dashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import EmployeeHome from '@/components/dashboard/EmployeeHome'
import { LayoutDashboard, User } from 'lucide-react'

// اللوحة تُختار بالصلاحية لا باسم الدور: dashboard.view_all → لوحة الإدارة، وغير ذلك → لوحتي.
// مبدّل «إدارة/موظف» (معاينة لوحة الموظف) يظهر فقط لمن يملك لوحة الإدارة
export default function DashboardPage() {
  // null حتى تُقرأ الجلسة بعد التركيب (localStorage غير متاح على السيرفر)
  const [view, setView] = useState<'admin' | 'employee' | null>(null)
  const [canAdmin, setCanAdmin] = useState(false)

  useEffect(() => {
    const allowed = can('dashboard.view_all')
    setCanAdmin(allowed)
    setView(allowed ? 'admin' : 'employee')
  }, [])

  // قبل تحديد اللوحة لا نعرض شيئاً — لا نداءات إدارية لغير المخوّل ولا وميض
  if (view === null) return <MainLayout>{null}</MainLayout>

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* العنوان + مبدّل معاينة اللوحات (لمن يملك لوحة الإدارة فقط) */}
        <div className="flex max-lg:flex-wrap items-center justify-between max-lg:gap-3">
          <h1 className="text-2xl font-bold text-gray-800">
            {view === 'admin' ? 'لوحة التحكم' : 'لوحتي'}
          </h1>
          {canAdmin && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setView('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'admin'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutDashboard size={16} />
                لوحة الإدارة
              </button>
              <button
                onClick={() => setView('employee')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === 'employee'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <User size={16} />
                لوحة الموظف
              </button>
            </div>
          )}
        </div>

        {/* B-ADD.3: بنود إخلاء الطرف مش هنا — مكانها «مهامي» وملف إنهاء الخدمة وصندوق الموافقات */}
        {view === 'employee' ? (
          <EmployeeHome />
        ) : (
          <>
            {/* فلتر اللوحة وكروتها: كل كارت بصلاحيته، وكل رقم جوه نطاق فروع الحساب */}
            <AdminDashboard />

            {/* Quick Actions */}
            <QuickActions />

            {/* Pending Approvals — اللي مستني قرار صاحب الحساب نفسه */}
            <PendingApprovals />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingEvents />
              <RecentActivities />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
