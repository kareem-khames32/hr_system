'use client'

// B-ADD.4 (إضافات المالك 11 أكتوبر): كارت «الإعلانات» فوق في «لوحتي» — آخر الإعلانات السارية اللي الموظف في جمهورها (نفس لوحة
// /announcements/board): المثبّت أول واحد، والجديد عليه علامة «جديد» لحد ما يتفتح، والإعلان اللي عليه «إقرار قراءة» فيه زرار «قريت».
// فتح إعلان عادي بيسجّله مقري؛ والإعلان اللي عليه إقرار بيتسجّل بالزرار بس. موديول الإعلانات مقفول = مفيش كارت ولا نداء.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronDown, Megaphone, Pin } from 'lucide-react'
import { useModuleEnabled } from '@/lib/modules'
import { fetchAnnouncementsBoard, markAnnouncementRead, type BoardAnnouncement } from '@/lib/announcements-api'

export const MY_ANNOUNCEMENTS_SHOWN = 5

export function MyAnnouncementsCard() {
  const on = useModuleEnabled('announcements')
  const [items, setItems] = useState<BoardAnnouncement[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!on) { setItems(null); return }
    let alive = true
    // اللوحة راجعة من الخادم المثبّت أولًا ثم الأحدث؛ فشل التحميل = من غير كارت (مايوقّعش اللوحة)
    fetchAnnouncementsBoard().then((board) => { if (alive) setItems(board.available ? board.items : []) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [on])

  if (!on || !items || items.length === 0) return null

  const markRead = async (item: BoardAnnouncement) => {
    if (item.read || busy !== null) return
    setBusy(item.id); setError('')
    try {
      const result = await markAnnouncementRead(item.id)
      setItems((current) => current?.map((row) => (row.id === item.id ? { ...row, read: true, readAt: result.readAt } : row)) ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل القراءة')
    } finally { setBusy(null) }
  }
  const toggle = (item: BoardAnnouncement) => {
    const opening = open !== item.id
    setOpen(opening ? item.id : null)
    // فتح إعلان عادي = اتقري. اللي عليه «إقرار قراءة» بزراره بس
    if (opening && !item.read && !item.requiresRead) void markRead(item)
  }
  const unread = items.filter((item) => !item.read).length

  return (
    <div className="card p-6" data-my-announcements>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Megaphone size={18} className="text-primary-600" /> الإعلانات
          {unread > 0 && <span className="text-xs font-medium bg-primary-100 text-primary-700 rounded-full px-2 py-0.5" data-my-announcements-unread>{unread} جديد</span>}
        </h3>
        <Link href="/announcements" className="text-sm text-primary-600 hover:underline">كل الإعلانات</Link>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 mb-2">{error}</p>}
      <ul className="divide-y divide-gray-100">
        {items.slice(0, MY_ANNOUNCEMENTS_SHOWN).map((item) => (
          <li key={item.id} className="py-2.5" data-my-announcement={item.id}>
            <button type="button" className="w-full flex items-center gap-2 text-start" aria-expanded={open === item.id} onClick={() => toggle(item)}>
              {item.pinned ? <Pin size={15} className="text-primary-600 shrink-0" /> : <Megaphone size={15} className="text-gray-400 shrink-0" />}
              <span className={`flex-1 min-w-0 break-words ${item.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{item.title}</span>
              {!item.read && <span className="text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 shrink-0" data-my-announcement-new>جديد</span>}
              {item.requiresRead && !item.read && <span className="text-xs bg-red-50 text-red-700 rounded-full px-2 py-0.5 shrink-0">محتاج إقرار</span>}
              <span className="text-xs text-gray-400 shrink-0"><bdi>{item.publishDate}</bdi></span>
              <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open === item.id ? 'rotate-180' : ''}`} />
            </button>
            {open === item.id && (
              <div className="mt-2 ps-6 space-y-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.body}</p>
                {item.attachment && <Link href="/announcements" className="text-xs underline text-primary-700">فيه مرفق — افتحه من شاشة الإعلانات</Link>}
                {item.read ? (
                  <p className="flex items-center gap-1 text-sm text-success-700"><CheckCircle2 size={15} /> {item.requiresRead ? 'أقرّيت بالقراءة' : 'مقري'}</p>
                ) : item.requiresRead ? (
                  <button type="button" className="btn-primary text-sm" disabled={busy !== null} onClick={() => void markRead(item)} data-my-announcement-ack>
                    {busy === item.id ? 'جاري التسجيل…' : 'قريت'}
                  </button>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length > MY_ANNOUNCEMENTS_SHOWN && (
        <p className="text-xs text-gray-500 mt-2">وفيه {items.length - MY_ANNOUNCEMENTS_SHOWN} إعلان تاني في <Link href="/announcements" className="text-primary-600 underline">شاشة الإعلانات</Link>.</p>
      )}
    </div>
  )
}

export default MyAnnouncementsCard
