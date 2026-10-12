import { useSyncExternalStore } from 'react'
import type { MeetInbox } from '@/lib/meet-api'

// B-ADD.15: حالة الاجتماعات المشتركة في التبويب:
//  - الاجتماع اللي التبويب جواه دلوقتي (شاشة الغرفة بتحطه): الرنة مابتطلعش فوق اجتماع شغال، وطلبات دخوله بتظهر جوه الغرفة نفسها.
//  - آخر رد من «صندوق الاجتماعات» (MeetGlobal بيسأله كل كام ثانية، والغرفة بتقرا منه طلبات الدخول).
//  - رسايل قصيرة بتظهر كام ثانية (النظام من غير مكوّن تنبيهات عام).

function store<T>(initial: T) {
  let value = initial
  const subs = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    subs.add(listener)
    return () => { subs.delete(listener) }
  }
  return {
    get: () => value,
    set: (next: T) => { value = next; subs.forEach((listener) => listener()) },
    use: (): T => useSyncExternalStore(subscribe, () => value, () => initial),
  }
}

const active = store<string | null>(null)
export const setActiveMeeting = active.set
export const getActiveMeeting = active.get
export const useActiveMeeting = active.use

const inbox = store<MeetInbox | null>(null)
export const setMeetInbox = inbox.set
export const useMeetInbox = inbox.use

export interface MeetNotice { id: number; text: string; tone: 'info' | 'danger' }
const notices = store<MeetNotice[]>([])
let noticeId = 0
const NOTICE_MS = 6000
export const useMeetNotices = notices.use
export const dismissMeetNotice = (id: number) => notices.set(notices.get().filter((notice) => notice.id !== id))
/** رسالة قصيرة فوق الشاشة (MeetGlobal بيعرضها) */
export function meetNotify(text: string, tone: MeetNotice['tone'] = 'info') {
  if (!text) return
  const id = ++noticeId
  notices.set([...notices.get().slice(-3), { id, text, tone }])
  setTimeout(() => dismissMeetNotice(id), NOTICE_MS)
}
