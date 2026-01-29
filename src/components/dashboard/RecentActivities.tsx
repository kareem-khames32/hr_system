'use client'

import {
  UserPlus,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  Award,
  AlertTriangle,
} from 'lucide-react'

interface Activity {
  id: string
  type: 'hire' | 'leave' | 'attendance' | 'document' | 'payroll' | 'performance' | 'alert'
  title: string
  description: string
  time: string
  user?: string
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'hire',
    title: 'موظف جديد',
    description: 'تم تعيين سارة أحمد في قسم التسويق',
    time: 'منذ 30 دقيقة',
    user: 'سارة أحمد',
  },
  {
    id: '2',
    type: 'leave',
    title: 'طلب إجازة',
    description: 'طلب محمد علي إجازة سنوية لمدة 5 أيام',
    time: 'منذ ساعة',
    user: 'محمد علي',
  },
  {
    id: '3',
    type: 'attendance',
    title: 'تأخر عن الدوام',
    description: 'تسجيل تأخر أحمد خالد - 45 دقيقة',
    time: 'منذ ساعتين',
    user: 'أحمد خالد',
  },
  {
    id: '4',
    type: 'payroll',
    title: 'اعتماد الرواتب',
    description: 'تم اعتماد مسير رواتب شهر يناير 2026',
    time: 'منذ 3 ساعات',
  },
  {
    id: '5',
    type: 'alert',
    title: 'تنبيه انتهاء وثيقة',
    description: 'جواز سفر عمر سعيد سينتهي خلال 30 يوم',
    time: 'منذ 4 ساعات',
    user: 'عمر سعيد',
  },
  {
    id: '6',
    type: 'performance',
    title: 'تقييم أداء',
    description: 'تم إكمال تقييم الأداء السنوي لفريق المبيعات',
    time: 'منذ 5 ساعات',
  },
]

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'hire':
      return { icon: <UserPlus size={18} />, bg: 'bg-success-50', color: 'text-success-600' }
    case 'leave':
      return { icon: <Calendar size={18} />, bg: 'bg-primary-50', color: 'text-primary-600' }
    case 'attendance':
      return { icon: <Clock size={18} />, bg: 'bg-warning-50', color: 'text-warning-600' }
    case 'document':
      return { icon: <FileText size={18} />, bg: 'bg-gray-100', color: 'text-gray-600' }
    case 'payroll':
      return { icon: <DollarSign size={18} />, bg: 'bg-success-50', color: 'text-success-600' }
    case 'performance':
      return { icon: <Award size={18} />, bg: 'bg-primary-50', color: 'text-primary-600' }
    case 'alert':
      return { icon: <AlertTriangle size={18} />, bg: 'bg-danger-50', color: 'text-danger-600' }
    default:
      return { icon: <FileText size={18} />, bg: 'bg-gray-100', color: 'text-gray-600' }
  }
}

export default function RecentActivities() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">آخر النشاطات</h3>
        <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
          عرض الكل
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => {
          const { icon, bg, color } = getActivityIcon(activity.type)
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{activity.title}</p>
                <p className="text-gray-500 text-sm mt-0.5 truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
