'use client'

// B-ADD.15: «الاجتماعات» — اجتماعاتي (الشغال دلوقتي، والجاي، واللي فات)، واجتماع فوري أو بميعاد. الاجتماع نفسه في /meet/<الكود>.
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Link2, Pencil, PhoneOff, Search, Trash2, Video, VideoOff } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDateTime } from '@/lib/dates'
import { normalizeSearchText } from '@/lib/employee-search'
import {
  cancelMeeting, endMeeting, fetchMeetings, MEET_INSECURE_TEXT, MEET_NOT_CONFIGURED_TEXT, MEET_NOT_READY_TEXT, MEET_PRIVACY_TEXT, meetErrorText, meetPath, type MeetingSummary, type MeetStatus,
} from '@/lib/meet-api'
import MeetDialog, { type MeetDialogMode } from '@/components/meet/MeetDialog'
import { MeetModal } from '@/components/meet/MeetBits'
import { useMeetInbox } from '@/components/meet/meetState'

const STATUS: Record<MeetStatus, { label: string; style: string }> = {
  live: { label: 'شغال دلوقتي', style: 'bg-green-50 text-green-700' },
  scheduled: { label: 'بميعاد', style: 'bg-blue-50 text-blue-700' },
  ended: { label: 'انتهى', style: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'اتلغى', style: 'bg-red-50 text-red-700' },
}
const REFRESH_MS = 30_000

export default function MeetPage() {
  const router = useRouter()
  const [list, setList] = useState<MeetingSummary[] | null>(null)
  // null = لسه بيتحمّل؛ ready/configured من الخادم
  const [state, setState] = useState<{ ready: boolean; configured: boolean } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ mode: MeetDialogMode; id?: string } | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'end'; meeting: MeetingSummary } | null>(null)
  const [insecure, setInsecure] = useState(false)
  useEffect(() => { setInsecure(!window.isSecureContext) }, [])

  const load = useCallback(() => {
    fetchMeetings().then((data) => {
      setList(data.meetings)
      setState({ ready: data.ready, configured: data.configured })
      setError('')
    }).catch((cause) => setError(meetErrorText(cause, 'تعذر تحميل الاجتماعات')))
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load() }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])
  // دعوة جديدة بترن (من صندوق الاجتماعات): القايمة بتتحدّث
  const ringing = (useMeetInbox()?.invites ?? []).map((invite) => invite.id).join()
  useEffect(() => { if (ringing) load() }, [ringing, load])

  const copyLink = (id: string) => {
    const url = `${window.location.origin}${meetPath(id)}`
    navigator.clipboard?.writeText(url).then(() => setNotice('لينك الاجتماع اتنسخ'), () => setNotice(url))
  }

  const runConfirm = async () => {
    if (!confirm) return
    const { kind, meeting } = confirm
    setConfirm(null)
    try {
      await (kind === 'cancel' ? cancelMeeting(meeting.id) : endMeeting(meeting.id))
      setNotice(kind === 'cancel' ? 'الاجتماع اتلغى' : 'الاجتماع انتهى')
      load()
    } catch (cause) {
      setError(meetErrorText(cause, 'تعذر تنفيذ الإجراء'))
    }
  }

  const usable = !!state?.ready && !!state.configured
  const wanted = normalizeSearchText(query)
  const shown = (list ?? []).filter((meeting) => !wanted || normalizeSearchText(`${meeting.title} ${meeting.host.displayName}`).includes(wanted))
  const live = shown.filter((meeting) => meeting.status === 'live').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const upcoming = shown.filter((meeting) => meeting.status === 'scheduled').sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
  const past = shown.filter((meeting) => meeting.status === 'ended' || meeting.status === 'cancelled')
    .sort((a, b) => (b.startsAt ?? b.createdAt).localeCompare(a.startsAt ?? a.createdAt)).slice(0, 50)

  const iconButton = 'rounded-lg p-2 text-gray-500 hover:bg-gray-100'
  const card = (meeting: MeetingSummary) => {
    const open = meeting.status === 'live' || meeting.status === 'scheduled'
    return (
      <div key={meeting.id} className="card flex flex-wrap items-center gap-4 p-4" data-meeting={meeting.status}>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meeting.status === 'live' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          {meeting.status === 'scheduled' ? <Calendar size={22} /> : <Video size={22} />}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-gray-800">{meeting.title}</strong>
          <span className="block text-sm text-gray-500">
            {formatDateTime(meeting.startsAt ?? meeting.createdAt)} · {meeting.isHost ? 'إنت صاحب الاجتماع' : `صاحب الاجتماع: ${meeting.host.displayName}`}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`badge ${STATUS[meeting.status].style}`}>{STATUS[meeting.status].label}</span>
            {meeting.status === 'live' && meeting.participants > 0 && <span className="text-xs text-gray-500">{meeting.participants} جوه دلوقتي</span>}
            {meeting.inviteCount > 0 && <span className="text-xs text-gray-400">{meeting.inviteCount} مدعو</span>}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {open && (
            <>
              <button type="button" className={`${meeting.status === 'live' ? 'btn-primary' : 'btn-secondary'} inline-flex items-center gap-2 !px-4 !py-2 text-sm`} onClick={() => router.push(meetPath(meeting.id))}>
                <Video size={16} /> ادخل
              </button>
              <button type="button" className={iconButton} title="انسخ لينك الاجتماع" aria-label="انسخ لينك الاجتماع" onClick={() => copyLink(meeting.id)}>
                <Link2 size={18} />
              </button>
            </>
          )}
          {meeting.isHost && open && (
            <button type="button" className={iconButton} title="تعديل الاجتماع" aria-label="تعديل الاجتماع" onClick={() => setDialog({ mode: 'edit', id: meeting.id })}>
              <Pencil size={18} />
            </button>
          )}
          {meeting.isHost && meeting.status === 'scheduled' && (
            <button type="button" className={`${iconButton} text-red-600`} title="إلغاء الاجتماع" aria-label="إلغاء الاجتماع" onClick={() => setConfirm({ kind: 'cancel', meeting })}>
              <Trash2 size={18} />
            </button>
          )}
          {meeting.isHost && meeting.status === 'live' && (
            <button type="button" className={`${iconButton} text-red-600`} title="إنهاء الاجتماع للكل" aria-label="إنهاء الاجتماع للكل" onClick={() => setConfirm({ kind: 'end', meeting })}>
              <PhoneOff size={18} />
            </button>
          )}
        </div>
      </div>
    )
  }
  const section = (title: string, items: MeetingSummary[]) => items.length > 0 && (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500">{title}</h2>
      <div className="grid gap-3">{items.map(card)}</div>
    </section>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
              <Video size={24} className="text-primary-600" />
              الاجتماعات
            </h1>
            <p className="mt-1 text-gray-500">اجتماعات صوت وصورة ومشاركة شاشة جوه النظام — فوري بيرن عند المدعوين، أو بميعاد</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" onClick={() => setDialog({ mode: 'instant' })} disabled={!usable}>
              <Video size={18} /> اجتماع فوري
            </button>
            <button type="button" className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50" onClick={() => setDialog({ mode: 'schedule' })} disabled={!usable}>
              <Calendar size={18} /> اجتماع بميعاد
            </button>
          </div>
        </div>

        {insecure && <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800" data-meet-insecure>{MEET_INSECURE_TEXT}</div>}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
        {notice && <div role="status" className="break-all rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

        {state && !state.ready && <EmptyState title={MEET_NOT_READY_TEXT} icon={VideoOff} />}
        {state && state.ready && !state.configured && (
          <div className="card px-6 py-12 text-center" data-meet-unconfigured>
            <VideoOff size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-700">{MEET_NOT_CONFIGURED_TEXT}</p>
            <p className="mt-1 text-sm text-gray-500">خادم الاجتماعات محتاج عنوانه ومفاتيحه في إعدادات الخادم — كلّم مدير النظام</p>
          </div>
        )}
        {!state && !error && <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>}

        {usable && (
          <>
            {(list?.length ?? 0) > 0 && (
              <div className="flex max-w-md items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دوّر بعنوان الاجتماع أو صاحبه" aria-label="دوّر بعنوان الاجتماع أو صاحبه" className="w-full bg-transparent text-sm focus:outline-none" />
              </div>
            )}
            {list && !list.length && <EmptyState title="مفيش اجتماعات لسه — ابدأ اجتماع فوري أو حدّد ميعاد" icon={Video} />}
            {list && list.length > 0 && !shown.length && <EmptyState title="مفيش اجتماعات مطابقة" />}
            {section('شغال دلوقتي', live)}
            {section('الجاي', upcoming)}
            {section('اللي فات', past)}
            <p className="text-xs text-gray-400">{MEET_PRIVACY_TEXT}</p>
          </>
        )}
      </div>

      {dialog && (
        <MeetDialog mode={dialog.mode} meetingId={dialog.id} onClose={() => setDialog(null)}
          onDone={(id) => {
            const mode = dialog.mode
            setDialog(null)
            if (mode === 'instant') router.push(meetPath(id))
            else {
              setNotice(mode === 'schedule' ? 'الاجتماع اتحدد ميعاده — هيرن عند المدعوين لما ييجي' : 'التعديل اتحفظ')
              load()
            }
          }} />
      )}
      {confirm && (
        <MeetModal title={confirm.kind === 'cancel' ? 'إلغاء الاجتماع' : 'إنهاء الاجتماع للكل'} onClose={() => setConfirm(null)}
          footer={<>
            <button type="button" className="btn-danger" onClick={() => void runConfirm()}>{confirm.kind === 'cancel' ? 'إلغاء الاجتماع' : 'إنهاء الاجتماع للكل'}</button>
            <button type="button" className="btn-secondary" onClick={() => setConfirm(null)}>رجوع</button>
          </>}>
          <p>{confirm.kind === 'cancel' ? `«${confirm.meeting.title}» هيتلغى ومش هيتفتح لحد. متأكد؟` : `«${confirm.meeting.title}» هينتهي وكل اللي فيه هيخرجوا. متأكد؟`}</p>
        </MeetModal>
      )}
    </MainLayout>
  )
}
