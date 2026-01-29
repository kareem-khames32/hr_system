'use client'

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

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
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
      </div>
    </MainLayout>
  )
}
