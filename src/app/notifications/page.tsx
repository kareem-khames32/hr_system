'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  FileText,
  DollarSign,
  Users,
  Settings,
  Trash2,
  Check,
} from 'lucide-react'
import { fetchNotifications } from '@/lib/api'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'alert'
  category: 'leave' | 'payroll' | 'attendance' | 'training' | 'system' | 'approval'
  timestamp: string
  read: boolean
  actionUrl?: string
}

const typeIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  alert: Bell,
}

const typeColors = {
  info: 'bg-blue-100 text-blue-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  alert: 'bg-red-100 text-red-600',
}

const categoryIcons = {
  leave: Calendar,
  payroll: DollarSign,
  attendance: Clock,
  training: FileText,
  system: Settings,
  approval: Users,
}

const categoryLabels = {
  leave: 'الإجازات',
  payroll: 'الرواتب',
  attendance: 'الحضور',
  training: 'التدريب',
  system: 'النظام',
  approval: 'الموافقات',
}

const mapKind = (kind: string): Notification['type'] => {
  if (kind === 'success') return 'success'
  if (kind === 'warning') return 'warning'
  if (kind === 'error') return 'alert'
  return 'info'
}

const mapCategory = (link: string): Notification['category'] => {
  if (link.includes('request')) return 'approval'
  if (link.includes('payroll') || link.includes('payslip')) return 'payroll'
  if (link.includes('attendance')) return 'attendance'
  if (link.includes('leave') || link.includes('balance')) return 'leave'
  return 'system'
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const [notificationsList, setNotificationsList] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchNotifications()
      .then((items) => {
        setNotificationsList(
          items.map((item) => ({
            id: item.id,
            title: item.title,
            message: item.body,
            type: mapKind(item.kind),
            category: mapCategory(item.link ?? ''),
            timestamp: item.at,
            read: false,
            actionUrl: item.link || undefined,
          }))
        )
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الإشعارات')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredNotifications = notificationsList.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    return n.category === filter
  })

  const unreadCount = notificationsList.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotificationsList((prev) => prev.filter((n) => n.id !== id))
  }

  const handleClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'الآن'
    if (hours < 24) return `منذ ${hours} ساعة`
    if (days < 7) return `منذ ${days} يوم`
    return date.toLocaleDateString('ar-SA')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الإشعارات</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0 ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'جميع الإشعارات مقروءة'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary flex items-center gap-2"
            >
              <Check size={18} />
              تحديد الكل كمقروء
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'unread', label: 'غير مقروء' },
            { id: 'leave', label: 'الإجازات' },
            { id: 'payroll', label: 'الرواتب' },
            { id: 'attendance', label: 'الحضور' },
            { id: 'training', label: 'التدريب' },
            { id: 'approval', label: 'الموافقات' },
            { id: 'system', label: 'النظام' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === item.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
              {item.id === 'unread' && unreadCount > 0 && (
                <span className="mr-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="card text-center py-12">
                <Bell size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد إشعارات</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const TypeIcon = typeIcons[notification.type]
                const CategoryIcon = categoryIcons[notification.category]

                return (
                  <div
                    key={notification.id}
                    className={`card hover:shadow-lg transition-all cursor-pointer ${
                      !notification.read ? 'border-r-4 border-r-primary-500 bg-primary-50/30' : ''
                    }`}
                    onClick={() => handleClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${typeColors[notification.type]}`}>
                        <TypeIcon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h3>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                                <CategoryIcon size={12} />
                                {categoryLabels[notification.category]}
                              </span>
                            </div>
                            <p className="text-gray-600">{notification.message}</p>
                            <p className="text-sm text-gray-400 mt-2">{formatTime(notification.timestamp)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="p-2 bg-gray-100 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                            </button>
                          </div>
                        </div>
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            className="inline-block mt-3 text-primary-600 font-medium text-sm hover:text-primary-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            عرض التفاصيل ←
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
