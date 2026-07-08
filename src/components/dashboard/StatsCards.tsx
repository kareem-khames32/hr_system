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
      value: Number(stats.employees.total).toLocaleString(),
      icon: <Users size={24} />,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      id: 'present',
      title: 'الحاضرون اليوم',
      value: Number(stats.attendanceToday.present).toLocaleString(),
      icon: <UserCheck size={24} />,
      iconBg: 'bg-success-50',
      iconColor: 'text-success-600',
    },
    {
      id: 'late',
      title: 'المتأخرون اليوم',
      value: Number(stats.attendanceToday.late).toLocaleString(),
      icon: <Clock size={24} />,
      iconBg: 'bg-warning-50',
      iconColor: 'text-warning-600',
    },
    {
      id: 'pending-requests',
      title: 'طلبات قيد المراجعة',
      value: Number(stats.requests.underReview).toLocaleString(),
      icon: <Briefcase size={24} />,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      id: 'on-leave',
      title: 'في إجازة',
      value: Number(stats.onLeaveToday).toLocaleString(),
      icon: <Calendar size={24} />,
      iconBg: 'bg-warning-50',
      iconColor: 'text-warning-600',
    },
    {
      id: 'absent',
      title: 'غائبون',
      value: Number(stats.attendanceToday.absent).toLocaleString(),
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
