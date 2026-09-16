'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { fetchNotifications, type ApiNotification } from '@/lib/api'
import { DISPLAY_LOCALE } from '@/lib/dates'

export default function RecentActivities() {
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchNotifications().then((rows) => {
      if (!cancelled) setItems([...rows].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5))
    }).catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل التنبيهات')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [revision])

  return <div className="card">
    <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold text-gray-800">آخر التنبيهات</h3><Link href="/notifications" className="text-sm text-primary-600">عرض الكل</Link></div>
    {loading ? <p className="text-sm text-gray-500">جارٍ التحميل...</p> : error ? <p role="alert" className="text-sm text-red-700">{error} <button onClick={() => setRevision(value => value + 1)} className="underline">إعادة المحاولة</button></p> : items.length === 0 ? <p className="text-sm text-gray-500">لا توجد تنبيهات.</p> : <div className="space-y-3">{items.map(item => <Link key={item.id} href={item.link || '/notifications'} className="flex items-start gap-3 rounded-xl p-3 hover:bg-gray-50"><Bell size={18} className="text-primary-600 shrink-0 mt-1" /><div className="min-w-0"><p className="font-medium text-sm text-gray-800">{item.title}</p><p className="text-sm text-gray-500 line-clamp-2">{item.body}</p><time className="text-xs text-gray-400" dateTime={item.at}>{new Date(item.at).toLocaleString(DISPLAY_LOCALE)}</time></div></Link>)}</div>}
  </div>
}
