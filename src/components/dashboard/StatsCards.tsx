'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Briefcase,
} from 'lucide-react'
import { fetchDashboardStats, type ApiDashboardStats } from '@/lib/api'

interface StatCard {
  id: string
  title: string
  value: string | number
  // سطر توضيحي صغير تحت الرقم (اختياري)
  hint?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

export default function StatsCards() {
  const [stats, setStats] = useState<ApiDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل الإحصائيات')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-10">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
  }

  if (!stats) return null

  const cards: StatCard[] = [
    {
      id: 'employees',
      title: 'إجمالي الموظفين',
      value: Number(stats.employees.total).toLocaleString('en-US'),
      icon: <Users size={24} />,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      id: 'present',
      title: 'الحاضرون اليوم',
      // كل من حضر فعلاً (يشمل المتأخر والمنصرف بدري والعامل يوم العطلة) — لا «في الموعد» فقط
      value: Number(stats.attendanceToday.attended).toLocaleString('en-US'),
      icon: <UserCheck size={24} />,
      iconBg: 'bg-success-50',
      iconColor: 'text-success-600',
    },
    {
      id: 'late',
      title: 'المتأخرون اليوم',
      value: Number(stats.attendanceToday.late).toLocaleString('en-US'),
      icon: <Clock size={24} />,
      iconBg: 'bg-warning-50',
      iconColor: 'text-warning-600',
    },
    {
      id: 'pending-requests',
      title: 'طلبات قيد المراجعة',
      value: Number(stats.requests.underReview).toLocaleString('en-US'),
      icon: <Briefcase size={24} />,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      id: 'on-leave',
      title: 'في إجازة',
      // يوم كامل فقط؛ إجازات نصف اليوم تُعرض منفصلة (صاحبها يعمل النصف الآخر)
      value: Number(stats.onLeaveToday).toLocaleString('en-US'),
      hint:
        Number(stats.halfDayLeaveToday) > 0
          ? `+ ${Number(stats.halfDayLeaveToday).toLocaleString('en-US')} بإجازة نصف يوم`
          : undefined,
      icon: <Calendar size={24} />,
      iconBg: 'bg-warning-50',
      iconColor: 'text-warning-600',
    },
    {
      id: 'absent',
      title: 'غائبون',
      value: Number(stats.attendanceToday.absent).toLocaleString('en-US'),
      icon: <UserX size={24} />,
      iconBg: 'bg-danger-50',
      iconColor: 'text-danger-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((stat) => (
        <div key={stat.id} className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              {stat.hint && <p className="text-xs text-gray-400 mt-1">{stat.hint}</p>}
            </div>
            <div
              className={`stat-icon ${stat.iconBg} ${stat.iconColor}`}
            >
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
