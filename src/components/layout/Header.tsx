'use client'

import { useCallback, useEffect, useRef, useState, type Ref } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  MessageSquare,
  Bell,
  Settings,
  ChevronDown,
  Calendar,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'
import {
  can,
  fetchNotifications,
  markNotificationsRead,
  NOTIFICATIONS_CHANGED,
} from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { PRODUCT_NAME } from '@/lib/product'
import { pageTitleFor } from './pageTitles'

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
  return formatDate(at)
}

interface HeaderProps {
  // زرار القائمة (أقل من lg بس): بيفتح القائمة الجانبية كدرج
  onMenuClick?: () => void
  menuOpen?: boolean
  menuButtonRef?: Ref<HTMLButtonElement>
}

export default function Header({ onMenuClick, menuOpen = false, menuButtonRef }: HeaderProps) {
  const pathname = usePathname() ?? ''
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationError, setNotificationError] = useState('')
  const [markingRead, setMarkingRead] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const loadNotifications = useCallback(() => {
    setNotificationError('')
    fetchNotifications()
      .then((items) =>
        setNotifications(
          items.map((item) => ({
            id: item.id,
            title: item.title,
            message: item.body,
            time: formatTime(item.at),
            read: item.read,
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
      .catch((err) => setNotificationError(err instanceof Error ? err.message : 'تعذر تحميل الإشعارات'))
  }, [])

  useEffect(() => {
    // القراءة/الحذف من شاشة الإشعارات أو من الجرس نفسه — حدّث القائمة والعدّاد
    window.addEventListener(NOTIFICATIONS_CHANGED, loadNotifications)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, loadNotifications)
  }, [loadNotifications])

  // الهيدر ثابت بين الصفحات: الإشعارات تتحدث مع كل انتقال والقائمة المنسدلة تُغلق
  useEffect(() => {
    loadNotifications()
    setShowNotifications(false)
  }, [loadNotifications, pathname])

  // ⌘K / Ctrl+K يركّز خانة البحث
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // الجرس يعدّ غير المقروء فقط
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    setMarkingRead(true)
    try {
      await markNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) { setNotificationError(err instanceof Error ? err.message : 'تعذر حفظ قراءة الإشعارات') }
    finally { setMarkingRead(false) }
  }

  // القراءة تُحفظ قبل الانتقال (الانتقال الكامل يقطع النداء المعلّق)
  const openNotification = async (n: Notification) => {
    if (!n.read) await markNotificationsRead([n.id]).catch(() => {})
    if (n.link) window.location.href = n.link
  }

  // البحث يفتح قائمة الموظفين مفلترة بـ ?q= — لمن يملك عرض الموظفين فقط
  const canSearch = can('employees.view')
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    window.location.href = q ? `/employees?q=${encodeURIComponent(q)}` : '/employees'
  }

  // عنوان الصفحة من المسار — الرئيسية حسب اللوحة المعروضة (dashboard.view_all)
  const pageTitle =
    pathname === '/'
      ? can('dashboard.view_all')
        ? 'لوحة التحكم'
        : 'لوحتي'
      : pageTitleFor(pathname) ?? 'نظام الموارد البشرية'

  // عنوان تبويب المتصفح = عنوان الشاشة | اسم المنتج (يُعاد تطبيقه لو كتبت Next عنوان الـmetadata العام بعده)
  useEffect(() => {
    const wanted = pageTitle === 'نظام الموارد البشرية' ? PRODUCT_NAME : `${pageTitle} | ${PRODUCT_NAME}`
    const apply = () => {
      if (document.title !== wanted) document.title = wanted
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [pageTitle])

  const formattedDate = formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between max-lg:gap-3 px-4 py-3 lg:px-8 lg:py-4">
        {/* زرار القائمة (أقل من lg) + عنوان الصفحة — على الموبايل العنوان سطر واحد بيتقص والتاريخ بيستخبى */}
        <div className="flex items-center gap-3 max-lg:min-w-0">
          {onMenuClick && (
            <button
              ref={menuButtonRef}
              type="button"
              onClick={onMenuClick}
              aria-label="فتح القائمة"
              aria-expanded={menuOpen}
              aria-controls="app-sidebar"
              className="lg:hidden print:hidden shrink-0 p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
          )}
          <div className="max-lg:min-w-0">
            <h2 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-800 max-lg:truncate">{pageTitle}</h2>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400 mt-1">
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 lg:gap-4 max-lg:shrink-0">
          {canSearch && <form onSubmit={submitSearch} className="relative hidden xl:block">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2.5 w-64">
              <Search size={18} className="text-gray-400" />
              <input ref={searchRef} type="search" aria-label="بحث عن موظف" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="بحث عن موظف..." className="bg-transparent border-none outline-none text-sm min-w-0 flex-1 placeholder-gray-400" />
              <button type="submit" aria-label="تنفيذ البحث" className="text-xs text-primary-600">بحث</button>
            </div>
          </form>}

          {/* Notifications — على الموبايل القائمة بتتموضع على عرض الهيدر كله (مش الجرس) فتفضل جوّه الشاشة */}
          <div className="sm:relative">
            <button
              aria-label="الإشعارات"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && (
                <span dir="ltr" className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-4 sm:left-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">الإشعارات</h3>
                  <button onClick={markAllRead} disabled={markingRead || unreadCount === 0} className="text-sm text-primary-500 hover:text-primary-600 disabled:opacity-50">
                    تحديد الكل كمقروء
                  </button>
                </div>
                <div className="max-h-[50vh] sm:max-h-96 overflow-y-auto">
                  {notificationError && <div role="alert" className="p-4 text-sm text-red-700">{notificationError} <button className="underline" onClick={loadNotifications}>إعادة المحاولة</button></div>}
                  {!notificationError && notifications.length === 0 && (
                    <p className="p-4 text-sm text-gray-500 text-center">لا توجد إشعارات</p>
                  )}
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => openNotification(notification)}
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

          {/* Settings — على الموبايل الترس بيستخبى (الإعدادات في القائمة) والهيدر يفضل فيه الجرس وزرار القائمة */}
          {can('settings.manage') && <Link href="/settings" aria-label="الإعدادات" className="hidden sm:block p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><Settings size={20} className="text-gray-600" /></Link>}
        </div>
      </div>
    </header>
  )
}
