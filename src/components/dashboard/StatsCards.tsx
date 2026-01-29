'use client'

import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Briefcase,
} from 'lucide-react'

interface StatCard {
  id: string
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

const stats: StatCard[] = [
  {
    id: '1',
    title: 'إجمالي الموظفين',
    value: 248,
    change: 12,
    changeType: 'increase',
    icon: <Users size={24} />,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  {
    id: '2',
    title: 'الحاضرون اليوم',
    value: 215,
    change: 3,
    changeType: 'decrease',
    icon: <UserCheck size={24} />,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-600',
  },
  {
    id: '3',
    title: 'في إجازة',
    value: 18,
    icon: <Calendar size={24} />,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-600',
  },
  {
    id: '4',
    title: 'غائبون',
    value: 5,
    change: 2,
    changeType: 'increase',
    icon: <UserX size={24} />,
    iconBg: 'bg-danger-50',
    iconColor: 'text-danger-600',
  },
]

export default function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.id} className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              {stat.change !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  {stat.changeType === 'increase' ? (
                    <TrendingUp size={16} className="text-success-500" />
                  ) : (
                    <TrendingDown size={16} className="text-danger-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === 'increase'
                        ? 'text-success-600'
                        : 'text-danger-600'
                    }`}
                  >
                    {stat.change}%
                  </span>
                  <span className="text-sm text-gray-400">من الشهر الماضي</span>
                </div>
              )}
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
