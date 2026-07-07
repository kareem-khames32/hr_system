'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  StatsCards,
  AttendanceChart,
  RecentActivities,
  PendingApprovals,
  QuickActions,
  UpcomingEvents,
  DepartmentStats,
} from '@/components/dashboard'
import EmployeeHome from '@/components/dashboard/EmployeeHome'
import { LayoutDashboard, User } from 'lucide-react'

// اللوحة تختلف حسب الدور — هذا المبدّل للمعاينة حتى يُربط بدور المستخدم الفعلي من الـ Backend
export default function DashboardPage() {
  const [view, setView] = useState<'admin' | 'employee'>('admin')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* مبدّل معاينة اللوحات (أدمن / موظف) */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            {view === 'admin' ? 'لوحة التحكم' : 'لوحتي'}
          </h1>
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
        </div>

        {view === 'employee' ? (
          <EmployeeHome />
        ) : (
          <>
            {/* Stats Cards */}
            <StatsCards />

            {/* Quick Actions */}
            <QuickActions />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Attendance Chart - Takes 2 columns */}
              <div className="lg:col-span-2">
                <AttendanceChart />
              </div>

              {/* Upcoming Events */}
              <div>
                <UpcomingEvents />
              </div>
            </div>

            {/* Pending Approvals */}
            <PendingApprovals />

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Stats - Takes 2 columns */}
              <div className="lg:col-span-2">
                <DepartmentStats />
              </div>

              {/* Recent Activities */}
              <div>
                <RecentActivities />
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
