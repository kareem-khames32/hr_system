'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  Bell,
  MessageSquare,
  Settings,
  ChevronDown,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react'
import { fetchNotifications } from '@/lib/api'

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'info' | 'warning' | 'success' | 'danger'
  link?: string
}

const formatTime = (at: string) => {
  const diff = Date.now() - new Date(at).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  if (days < 7) return `منذ ${days} يوم`
  return new Date(at).toLocaleDateString('ar-SA')
}

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    fetchNotifications()
      .then((items) =>
        setNotifications(
          items.map((item) => ({
            id: item.id,
            title: item.title,
            message: item.body,
            time: formatTime(item.at),
            read: false,
            type:
              item.kind === 'error'
                ? 'danger'
                : item.kind === 'success'
                ? 'success'
                : item.kind === 'warning'
                ? 'warning'
                : 'info',
            link: item.link || undefined,
          }))
        )
      )
      .catch(() => {})
  }, [])

  const unreadCount = notifications.length

  const today = new Date()
  const formattedDate = today.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between px-8 py-4">
        {/* Page Title & Breadcrumb */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">لوحة التحكم</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5 w-72">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن موظف، طلب، تقرير..."
                className="bg-transparent border-none outline-none text-sm flex-1 placeholder-gray-400"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs text-gray-400 shadow-sm">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">الإشعارات</h3>
                  <button className="text-sm text-primary-500 hover:text-primary-600">
                    تحديد الكل كمقروء
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="p-4 text-sm text-gray-500 text-center">لا توجد إشعارات</p>
                  )}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (notification.link) window.location.href = notification.link
                      }}
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'info'
                              ? 'bg-primary-500'
                              : notification.type === 'warning'
                              ? 'bg-warning-500'
                              : notification.type === 'success'
                              ? 'bg-success-500'
                              : 'bg-danger-500'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-gray-500 text-sm mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50">
                  <button
                    onClick={() => {
                      window.location.href = '/notifications'
                    }}
                    className="w-full text-center text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    عرض كل الإشعارات
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <button className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors relative">
            <MessageSquare size={20} className="text-gray-600" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-success-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Settings */}
          <button className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            <Settings size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  )
}
