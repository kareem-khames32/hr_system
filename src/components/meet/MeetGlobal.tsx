'use client'

// B-ADD.15: مركّب مرة واحدة في الإطار الدائم (لما موديول الاجتماعات مفتوح للحساب). النظام من غير اتصال لحظي، فهنا بيتسأل «صندوق الاجتماعات»
// كل كام ثانية والتبويب ظاهر، ومنه: الدعوة اللي بترن (ادخل / اعتذر)، وطلبات دخول اجتماعات الحساب (دخّله / ارفض)، واعتذارات مدعويه، والرسايل
// القصيرة. اللي جوه الغرفة بيوصله الباقي من LiveKit نفسه.
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Check, PhoneOff, Video, X } from 'lucide-react'
import { answerKnock, declineMeeting, fetchMeetInbox, meetErrorText, meetPath, type MeetKnock, type MeetRing } from '@/lib/meet-api'
import { MeetAvatar } from './MeetBits'
import { useOptionalMeetSession } from './MeetSession'
import { dismissMeetNotice, meetNotify, setMeetInbox, useActiveMeeting, useMeetInbox, useMeetNotices } from './meetState'

/** كل كام ثانية بيتسأل الصندوق والتبويب ظاهر؛ ولو الاجتماعات لسه ماتظبطتش (أو الخادم مش بيرد) كل دقيقة */
export const MEET_POLL_MS = 5000
const IDLE_POLL_MS = 60_000
const RING_EVERY_MS = 3000

/** رنة قصيرة (نغمتين) من غير ملف صوت — لو المتصفح مانع الصوت قبل أول ضغطة مابيحصلش حاجة */
function ringOnce(context: AudioContext) {
  for (const [frequency, at] of [[660, 0], [880, 0.22]] as const) {
    const oscillator = context.createOscillator(), gain = context.createGain()
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, context.currentTime + at)
    gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + at + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + 0.2)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(context.currentTime + at)
    oscillator.stop(context.currentTime + at + 0.22)
  }
}

const knockKey = (knock: MeetKnock) => `${knock.meetingId}:${knock.user.id}`

export default function MeetGlobal() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const session = useOptionalMeetSession()
  const active = useActiveMeeting()
  const inbox = useMeetInbox()
  const notices = useMeetNotices()
  // اللي المستخدم رد عليه في التبويب ده (لحد ما الخادم يبطّل يبعته)
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
  const toldDeclines = useRef(new Set<string>())

  // ------------------------------------------------------------ السؤال الدوري
  useEffect(() => {
    let stopped = false, running = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      if (stopped || running) return
      running = true
      let delay = MEET_POLL_MS
      if (document.visibilityState === 'visible') {
        try {
          const next = await fetchMeetInbox()
          if (stopped) return
          setMeetInbox(next)
          if (!next.ready || !next.configured) delay = IDLE_POLL_MS
        } catch {
          delay = IDLE_POLL_MS
        }
      }
      running = false
      if (!stopped) timer = setTimeout(tick, delay)
    }
    // التبويب رجع ظاهر: اسأل دلوقتي
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || running) return
      clearTimeout(timer)
      void tick()
    }
    void tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      setMeetInbox(null)
    }
  }, [])

  // اعتذار مدعو: كلمة لصاحب الاجتماع مرة واحدة
  useEffect(() => {
    for (const entry of inbox?.declines ?? []) {
      const key = `${entry.meetingId}:${entry.user.id}:${entry.at}`
      if (toldDeclines.current.has(key)) continue
      toldDeclines.current.add(key)
      meetNotify(`${entry.user.displayName} اعتذر عن «${entry.title}»`)
    }
  }, [inbox])

  // الرنة مابتطلعش فوق اجتماع شغال في التبويب، ولا لاجتماع صفحته مفتوحة قدام المستخدم
  const rings: MeetRing[] = active ? [] : (inbox?.invites ?? []).filter((invite) => !dismissed.has(invite.id) && session?.id !== invite.id)
  // طلبات الدخول: جوه غرفة الاجتماع نفسه (وهي ملء الشاشة) الغرفة بتعرضها
  const roomOnScreen = session?.phase.k === 'room' && pathname === meetPath(session.id ?? '')
  const knocks: MeetKnock[] = (inbox?.knocks ?? []).filter((knock) => !dismissed.has(knockKey(knock)) && !(roomOnScreen && knock.meetingId === session?.id))

  const ringing = rings.length > 0
  useEffect(() => {
    if (!ringing) return
    let context: AudioContext | null = null
    try {
      context = new AudioContext()
    } catch {
      return
    }
    const play = () => { if (context && context.state === 'running') ringOnce(context) }
    play()
    const timer = setInterval(play, RING_EVERY_MS)
    return () => {
      clearInterval(timer)
      void context?.close()
    }
  }, [ringing])

  const dismiss = (key: string) => setDismissed((current) => new Set(current).add(key))
  const joinRing = (invite: MeetRing) => {
    dismiss(invite.id)
    router.push(meetPath(invite.id))
  }
  const declineRing = (invite: MeetRing) => {
    dismiss(invite.id)
    if (!invite.isHost) declineMeeting(invite.id).catch(() => undefined)
  }
  const answer = (knock: MeetKnock, admit: boolean) => {
    dismiss(knockKey(knock))
    // لو نفس الشخص طلب تاني بعدين، طلبه الجديد يظهر
    setTimeout(() => setDismissed((current) => {
      const next = new Set(current)
      next.delete(knockKey(knock))
      return next
    }), 15_000)
    answerKnock(knock.meetingId, knock.user.id, admit).catch((error) => meetNotify(meetErrorText(error, 'تعذر الرد على طلب الدخول'), 'danger'))
  }

  if (!rings.length && !knocks.length && !notices.length) return null
  const card = 'w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 text-gray-800 shadow-2xl ring-1 ring-black/5'
  const accept = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-500'
  const refuse = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100'
  return (
    <div className="fixed end-4 top-4 z-[95] flex flex-col items-end gap-3" role="region" aria-live="assertive" aria-label="الاجتماعات" data-meet-global>
      {notices.map((notice) => (
        <div key={notice.id} role={notice.tone === 'danger' ? 'alert' : 'status'} className={`flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-lg ${notice.tone === 'danger' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => dismissMeetNotice(notice.id)} aria-label="إغلاق" className="rounded p-0.5 hover:bg-white/20">
            <X size={14} />
          </button>
        </div>
      ))}
      {rings.map((invite) => (
        <div key={invite.id} className={card} data-meet-ring>
          <div className="flex items-center gap-3">
            <MeetAvatar id={invite.host.id} name={invite.host.displayName} size={38} />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{invite.isHost ? 'اجتماعك بدأ ميعاده' : `${invite.host.displayName} بيدعوك لاجتماع`}</strong>
              <span className="block truncate text-xs text-gray-500">{invite.title}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={accept} onClick={() => joinRing(invite)}><Video size={16} /> ادخل</button>
            <button type="button" className={refuse} onClick={() => declineRing(invite)}><PhoneOff size={16} /> {invite.isHost ? 'بعدين' : 'اعتذر'}</button>
          </div>
        </div>
      ))}
      {knocks.map((knock) => (
        <div key={knockKey(knock)} className={card} data-meet-knock>
          <div className="flex items-center gap-3">
            <MeetAvatar id={knock.user.id} name={knock.user.displayName} size={38} />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{knock.user.displayName} عايز يدخل الاجتماع</strong>
              <span className="block truncate text-xs text-gray-500">{knock.title}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={accept} onClick={() => answer(knock, true)}><Check size={16} /> دخّله</button>
            <button type="button" className={refuse} onClick={() => answer(knock, false)}><X size={16} /> ارفض</button>
          </div>
        </div>
      ))}
    </div>
  )
}
