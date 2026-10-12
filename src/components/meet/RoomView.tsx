'use client'

// B-ADD.15: الاجتماع نفسه — شبكة المشاركين أو مسرح (شاشة متشاركة أو مشارك مثبّت)، وأزرار التحكم، ودردشة الاجتماع (رسايل LiveKit اللحظية:
// مابتتخزّنش في أي مكان)، وقايمة المشاركين بتحكم صاحب الاجتماع، وطلبات الدخول. مبني على livekit-client مباشرة، وبيتحمّل لما اجتماع يتفتح بس.
import { type Participant, RemoteParticipant, type Room, RoomEvent, type RoomEventCallbacks, Track } from 'livekit-client'
import { type CSSProperties, type FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Crown, DoorOpen, Hand, LayoutGrid, MessageCircle, Mic, MicOff, Minus, PhoneOff, ScreenShare, ScreenShareOff, Send, Settings, Users, Video, VideoOff, Volume2, X } from 'lucide-react'
import { DISPLAY_LOCALE } from '@/lib/dates'
import { answerKnock, endMeeting, meetErrorText, muteParticipant, removeParticipant, type MeetingDetail, type MeetPerson } from '@/lib/meet-api'
import DeviceSelects from './DeviceSelects'
import { type MeetPrefs, mediaErrorText } from './devices'
import { MeetAvatar, MeetModal } from './MeetBits'
import { meetNotify, useMeetInbox } from './meetState'
import { AudioTrackPlayer, SignalBars, Tile, type TileSource } from './Tile'

interface ChatMessage { id: string; from: string; name: string; text: string; ts: number; mine: boolean }
type Panel = 'chat' | 'people' | 'settings' | null
interface Item { p: Participant; source: TileSource; key: string }

const MAX_GRID = 25
const MAX_STRIP = 12
const MAX_CHAT = 2000
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function jobTitleOf(participant: Participant): string {
  try {
    return String(JSON.parse(participant.metadata || '{}').jobTitle ?? '')
  } catch {
    return ''
  }
}

/** أكبر مربع 16:9 يشيل n مربع في مساحة w × h */
function fitGrid(w: number, h: number, n: number, gap = 8) {
  const aspect = 16 / 9
  let best = { cols: 1, tw: 0, th: 0 }
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols)
    let tw = (w - gap * (cols - 1)) / cols
    let th = tw / aspect
    if (th * rows + gap * (rows - 1) > h) {
      th = (h - gap * (rows - 1)) / rows
      tw = th * aspect
    }
    if (tw > best.tw) best = { cols, tw, th }
  }
  return best
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

export function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((now - since) / 1000))
  const hh = Math.floor(seconds / 3600)
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return <span dir="ltr">{hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`}</span>
}

const control = (state: '' | 'off' | 'active' | 'leave' = '') =>
  `relative inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-2 rounded-full px-3 transition-colors disabled:opacity-50 ${
    state === 'off' || state === 'leave' ? 'bg-red-600 text-white hover:bg-red-500' : state === 'active' ? 'bg-primary-500 text-white hover:bg-primary-400' : 'bg-gray-700 text-white hover:bg-gray-600'}`
const iconButton = 'rounded-lg p-1.5 text-gray-300 hover:bg-gray-700'

export default function RoomView({ room, meeting, isHost, prefs, setPrefs, joinedAt, minimized = false, onMinimize, onLeave }: {
  room: Room
  meeting: MeetingDetail
  isHost: boolean
  prefs: MeetPrefs
  setPrefs: (prefs: Partial<MeetPrefs>) => void
  /** إمتى التبويب ده دخل (عند الجلسة، ومشترك مع النافذة الصغيرة) */
  joinedAt: number
  /** الاجتماع مكمّل في النافذة الصغيرة: مفيش حاجة ظاهرة هنا، والصوت والحالة مكمّلين */
  minimized?: boolean
  onMinimize: () => void
  onLeave: () => void
}) {
  const [, setTick] = useState(0)
  const raf = useRef(0)
  const lastSpoke = useRef(new Map<string, number>())
  const [hands, setHands] = useState<Set<string>>(() => new Set())
  const myHand = useRef(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unread, setUnread] = useState(0)
  const [panel, setPanelState] = useState<Panel>(null)
  const panelRef = useRef<Panel>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [canPlay, setCanPlay] = useState(room.canPlaybackAudio)
  const [busy, setBusy] = useState<{ mic?: boolean; cam?: boolean; screen?: boolean }>({})
  const [leaveMenu, setLeaveMenu] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Participant | null>(null)
  const [mainRef, mainSize] = useSize<HTMLDivElement>()
  // طلبات الدخول من «صندوق الاجتماعات» (بيتسأل كل كام ثانية)، من غير اللي اترد عليه دلوقتي
  const inbox = useMeetInbox()
  const [answered, setAnswered] = useState<Set<number>>(() => new Set())
  const knocks: Array<{ user: MeetPerson }> = isHost ? (inbox?.knocks ?? []).filter((knock) => knock.meetingId === meeting.id && !answered.has(knock.user.id)) : []

  const bump = useCallback(() => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      setTick((value) => value + 1)
    })
  }, [])

  const setPanel = (wanted: Panel) => {
    const next = panel === wanted ? null : wanted
    panelRef.current = next
    setPanelState(next)
    if (next === 'chat') setUnread(0)
  }

  const sendData = useCallback((message: { type: string } & Record<string, unknown>, to?: string[]) => {
    void room.localParticipant.publishData(encoder.encode(JSON.stringify(message)), { reliable: true, topic: message.type, destinationIdentities: to }).catch(() => undefined)
  }, [room])

  // ------------------------------------------------------------ أحداث LiveKit
  useEffect(() => {
    const offs: Array<() => void> = []
    const on = <E extends keyof RoomEventCallbacks>(event: E, handler: RoomEventCallbacks[E]) => {
      room.on(event, handler)
      offs.push(() => room.off(event, handler))
    }
    const redraw = [
      RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackPublished, RoomEvent.TrackUnpublished, RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ConnectionQualityChanged, RoomEvent.ParticipantNameChanged,
      RoomEvent.ParticipantMetadataChanged, RoomEvent.TrackStreamStateChanged,
    ] as const
    for (const event of redraw) on(event, bump as never)
    on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const now = Date.now()
      for (const speaker of speakers) lastSpoke.current.set(speaker.identity, now)
      bump()
    })
    on(RoomEvent.Reconnecting, () => setReconnecting(true))
    on(RoomEvent.SignalReconnecting, () => setReconnecting(true))
    on(RoomEvent.Reconnected, () => {
      setReconnecting(false)
      bump()
    })
    on(RoomEvent.AudioPlaybackStatusChanged, () => setCanPlay(room.canPlaybackAudio))
    on(RoomEvent.MediaDevicesError, (error) => {
      const text = mediaErrorText(error, 'camera')
      if (text) meetNotify(text, 'danger')
    })
    on(RoomEvent.ParticipantConnected, (participant) => {
      // اللي دخل متأخر بيعرف مين رافع إيده
      if (myHand.current) sendData({ type: 'hand', up: true }, [participant.identity])
    })
    on(RoomEvent.ParticipantDisconnected, (participant) =>
      setHands((current) => {
        if (!current.has(participant.identity)) return current
        const next = new Set(current)
        next.delete(participant.identity)
        return next
      }))
    on(RoomEvent.DataReceived, (payload, participant) => {
      if (!participant) return
      let message: { type?: unknown; text?: unknown; id?: unknown; up?: unknown }
      try {
        message = JSON.parse(decoder.decode(payload))
      } catch {
        return
      }
      if (message.type === 'chat' && typeof message.text === 'string' && message.text.trim()) {
        const entry: ChatMessage = {
          id: typeof message.id === 'string' ? message.id.slice(0, 40) : Math.random().toString(36).slice(2),
          from: participant.identity, name: participant.name || participant.identity, text: message.text.slice(0, MAX_CHAT), ts: Date.now(), mine: false,
        }
        setMessages((list) => [...list.slice(-299), entry])
        if (panelRef.current !== 'chat') setUnread((count) => count + 1)
      } else if (message.type === 'hand') {
        const up = message.up === true
        setHands((current) => {
          const next = new Set(current)
          if (up) next.add(participant.identity)
          else next.delete(participant.identity)
          return next
        })
        if (up && isHost) meetNotify(`${participant.name || 'مشارك'} رفع إيده`)
      }
    })
    bump()
    return () => {
      offs.forEach((off) => off())
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [room, bump, sendData, isHost])

  // ------------------------------------------------------------ طلبات الدخول (صاحب الاجتماع)
  const answer = async (userId: number, admit: boolean) => {
    setAnswered((current) => new Set(current).add(userId))
    // لو نفس الشخص طلب تاني بعدين، طلبه الجديد يظهر
    setTimeout(() => setAnswered((current) => {
      const next = new Set(current)
      next.delete(userId)
      return next
    }), 15_000)
    try {
      await answerKnock(meeting.id, userId, admit)
    } catch (error) {
      meetNotify(meetErrorText(error, 'تعذر الرد على طلب الدخول'), 'danger')
    }
  }

  // ------------------------------------------------------------ تحكم الحساب في نفسه
  const me = room.localParticipant
  const micOn = me.isMicrophoneEnabled
  const camOn = me.isCameraEnabled
  const sharing = me.isScreenShareEnabled

  const toggle = async (kind: 'mic' | 'cam' | 'screen') => {
    if (busy[kind]) return
    setBusy((current) => ({ ...current, [kind]: true }))
    try {
      if (kind === 'mic') await me.setMicrophoneEnabled(!micOn)
      else if (kind === 'cam') await me.setCameraEnabled(!camOn)
      else if (!sharing && !navigator.mediaDevices?.getDisplayMedia) meetNotify('المتصفح ده مابيدعمش مشاركة الشاشة', 'danger')
      else await me.setScreenShareEnabled(!sharing, { audio: true, selfBrowserSurface: 'exclude', surfaceSwitching: 'include' })
    } catch (error) {
      const text = mediaErrorText(error, kind === 'mic' ? 'mic' : kind === 'cam' ? 'camera' : 'screen')
      if (text) meetNotify(text, 'danger')
    } finally {
      setBusy((current) => ({ ...current, [kind]: false }))
      bump()
    }
  }

  const toggleHand = () => {
    const up = !myHand.current
    myHand.current = up
    sendData({ type: 'hand', up })
    setHands((current) => {
      const next = new Set(current)
      if (up) next.add(me.identity)
      else next.delete(me.identity)
      return next
    })
  }

  const [draft, setDraft] = useState('')
  const sendChat = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim().slice(0, MAX_CHAT)
    if (!text) return
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    sendData({ type: 'chat', id, text })
    setMessages((list) => [...list.slice(-299), { id, from: me.identity, name: me.name || '', text, ts: Date.now(), mine: true }])
    setDraft('')
  }
  const chatEnd = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (panel === 'chat') chatEnd.current?.scrollIntoView({ block: 'end' })
  }, [messages, panel])

  // ------------------------------------------------------------ تحكم صاحب الاجتماع
  const hostAction = async (action: 'mute' | 'remove', identity: string, track: 'audio' | 'video' = 'audio') => {
    try {
      if (action === 'mute') await muteParticipant(meeting.id, Number(identity), track)
      else {
        await removeParticipant(meeting.id, Number(identity))
        meetNotify('المشارك خرج من الاجتماع')
      }
    } catch (error) {
      meetNotify(meetErrorText(error, 'تعذر تنفيذ الإجراء'), 'danger')
    }
  }
  const endForAll = async () => {
    setConfirmEnd(false)
    try {
      await endMeeting(meeting.id)
    } catch (error) {
      meetNotify(meetErrorText(error, 'تعذر إنهاء الاجتماع'), 'danger')
    }
  }

  // ------------------------------------------------------------ التوزيع على الشاشة
  const hostId = String(meeting.host.id)
  const remotes = [...room.remoteParticipants.values()]
  const participants: Participant[] = [me, ...remotes]
  const shares: Item[] = participants
    .filter((participant) => {
      const publication = participant.getTrackPublication(Track.Source.ScreenShare)
      return !!publication && !publication.isMuted
    })
    .sort((a, b) => Number(a.isLocal) - Number(b.isLocal))
    .map((participant) => ({ p: participant, source: Track.Source.ScreenShare, key: `${participant.identity}:screen` }))
  const ranked = [...remotes].sort((a, b) => {
    const spoke = (lastSpoke.current.get(b.identity) ?? 0) - (lastSpoke.current.get(a.identity) ?? 0)
    if (spoke) return spoke
    const camera = Number(b.isCameraEnabled) - Number(a.isCameraEnabled)
    if (camera) return camera
    return (a.name ?? '').localeCompare(b.name ?? '', 'ar')
  })
  const cameras: Item[] = [me, ...ranked].map((participant) => ({ p: participant, source: Track.Source.Camera, key: `${participant.identity}:camera` }))
  const all = [...shares, ...cameras]
  const stage = (pinned && all.find((item) => item.key === pinned)) || shares[0] || null
  const others = stage ? all.filter((item) => item.key !== stage.key && !(item.source === Track.Source.ScreenShare && item.p.isLocal)) : cameras
  const visible = others.slice(0, stage ? MAX_STRIP : MAX_GRID)
  const overflow = others.length - visible.length

  const grid = useMemo(() => fitGrid(mainSize.w - 16, mainSize.h - 16, visible.length + (overflow > 0 ? 1 : 0)), [mainSize.w, mainSize.h, visible.length, overflow])

  // مشارك مثبّت ومشي أو وقّف المشاركة: رجوع للتوزيع التلقائي
  useEffect(() => {
    if (pinned && !all.some((item) => item.key === pinned)) setPinned(null)
  })

  const tile = (item: Item, big: boolean, style?: CSSProperties) => (
    <Tile key={item.key} participant={item.p} source={item.source} hostId={hostId} hand={hands.has(item.p.identity)} pinned={pinned === item.key}
      onPin={() => setPinned(pinned === item.key ? null : item.key)} style={style} big={big} />
  )

  const present = new Set(participants.map((participant) => participant.identity))
  const notJoined = (meeting.invitees ?? []).filter((person) => !present.has(String(person.id)) && person.id !== meeting.host.id)
  const clock = useMemo(() => new Intl.DateTimeFormat(DISPLAY_LOCALE, { hour: '2-digit', minute: '2-digit' }), [])
  const panelTitle = panel === 'chat' ? 'دردشة الاجتماع' : panel === 'people' ? 'المشاركين' : 'الإعدادات'
  const myHandUp = hands.has(me.identity)

  return (
    <div className={`fixed inset-0 z-[70] flex-col bg-gray-900 text-white ${minimized ? 'hidden' : 'flex'}`} data-meet-room>
      <header className="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-2">
        <div className="min-w-0">
          <strong className="block truncate">{meeting.title}</strong>
          <span className="text-xs text-gray-400">
            <Elapsed since={joinedAt} /> · {participants.length} مشارك
          </span>
        </div>
        <div className="flex items-center gap-2">
          {reconnecting && <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs text-amber-300">بيعيد الاتصال…</span>}
          <SignalBars quality={me.connectionQuality} />
          {pinned && (
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 px-3 py-1.5 text-xs hover:bg-gray-600" onClick={() => setPinned(null)}>
              <LayoutGrid size={16} /> توزيع تلقائي
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 p-2" ref={mainRef}>
          {minimized ? null : stage ? (
            <div className="flex h-full flex-col gap-2">
              <div className="min-h-0 flex-1">{tile(stage, true)}</div>
              {visible.length > 0 && (
                <div className="flex h-28 shrink-0 gap-2 overflow-x-auto">
                  {visible.map((item) => tile(item, false, { width: 176, height: '100%', flexShrink: 0 }))}
                  {overflow > 0 && <div className="flex w-24 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-lg">+{overflow}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-wrap content-center items-center justify-center gap-2">
              {visible.map((item) => tile(item, visible.length === 1, visible.length === 1 ? { width: '100%', height: '100%' } : { width: grid.tw, height: grid.th }))}
              {overflow > 0 && (
                <button type="button" className="flex items-center justify-center rounded-xl bg-gray-800 text-lg" style={{ width: grid.tw, height: grid.th }} onClick={() => setPanel('people')}>
                  +{overflow}
                </button>
              )}
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-3">
            {reconnecting && <div className="pointer-events-auto rounded-xl bg-amber-500 px-4 py-2 text-sm text-gray-900">الاتصال اتقطع — بنحاول نرجّعه</div>}
            {!canPlay && (
              <button type="button" className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-gray-700 px-4 py-2 text-sm" onClick={() => void room.startAudio().then(() => setCanPlay(room.canPlaybackAudio))}>
                <Volume2 size={16} /> دوس هنا عشان تسمع الصوت
              </button>
            )}
            {sharing && (
              <div className="pointer-events-auto inline-flex items-center gap-3 rounded-xl bg-gray-700 px-4 py-2 text-sm">
                <ScreenShare size={16} /> إنت بتشارك شاشتك
                <button type="button" className="rounded-lg bg-red-600 px-3 py-1 text-xs hover:bg-red-500" onClick={() => void toggle('screen')}>وقّف المشاركة</button>
              </div>
            )}
            {isHost && knocks.length > 0 && panel !== 'people' && (
              <div className="pointer-events-auto inline-flex flex-wrap items-center gap-3 rounded-xl bg-gray-700 px-4 py-2 text-sm" data-meet-knocks>
                <DoorOpen size={16} />
                {knocks.length === 1 ? `${knocks[0].user.displayName} عايز يدخل الاجتماع` : `${knocks.length} عايزين يدخلوا الاجتماع`}
                {knocks.length === 1 ? (
                  <>
                    <button type="button" className="rounded-lg bg-green-600 px-3 py-1 text-xs hover:bg-green-500" onClick={() => void answer(knocks[0].user.id, true)}>دخّله</button>
                    <button type="button" className="rounded-lg bg-red-600 px-3 py-1 text-xs hover:bg-red-500" onClick={() => void answer(knocks[0].user.id, false)}>ارفض</button>
                  </>
                ) : (
                  <button type="button" className="rounded-lg bg-green-600 px-3 py-1 text-xs hover:bg-green-500" onClick={() => setPanel('people')}>شوفهم</button>
                )}
              </div>
            )}
          </div>
        </div>

        {panel && (
          <aside className="flex w-80 max-w-full shrink-0 flex-col border-s border-gray-800 bg-gray-900" aria-label={panelTitle}>
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <strong>{panelTitle}</strong>
              <button type="button" className={iconButton} onClick={() => setPanel(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            {panel === 'chat' && (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
                  <p className="text-center text-xs text-gray-500">الدردشة دي مابتتحفظش — بتختفي مع نهاية الاجتماع</p>
                  {messages.map((message) => (
                    <div key={message.id + message.from} className={`flex flex-col ${message.mine ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-gray-500">
                        {message.mine ? 'إنت' : message.name} · {clock.format(message.ts)}
                      </span>
                      <span dir="auto" className={`mt-0.5 max-w-full whitespace-pre-wrap break-words rounded-xl px-3 py-1.5 text-sm ${message.mine ? 'bg-primary-600' : 'bg-gray-700'}`}>
                        {message.text}
                      </span>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <form className="flex items-center gap-2 border-t border-gray-800 p-3" onSubmit={sendChat}>
                  <input className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none" value={draft} maxLength={MAX_CHAT}
                    onChange={(event) => setDraft(event.target.value)} placeholder="اكتب رسالة" dir="auto" autoFocus />
                  <button className="rounded-xl bg-primary-500 p-2.5 text-white disabled:opacity-50" type="submit" disabled={!draft.trim()} aria-label="ابعت">
                    <Send size={16} className="rtl:-scale-x-100" />
                  </button>
                </form>
              </>
            )}

            {panel === 'people' && (
              <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
                {isHost && knocks.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs text-gray-400">مستنيين الدخول</h4>
                    {knocks.map((knock) => (
                      <div key={knock.user.id} className="flex items-center gap-2 py-1.5">
                        <MeetAvatar id={knock.user.id} name={knock.user.displayName} />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">{knock.user.displayName}</strong>
                          {knock.user.jobTitle && <span className="block truncate text-xs text-gray-400">{knock.user.jobTitle}</span>}
                        </span>
                        <button type="button" className="rounded-lg bg-green-600 px-3 py-1 text-xs hover:bg-green-500" onClick={() => void answer(knock.user.id, true)}>دخّله</button>
                        <button type="button" className={iconButton} onClick={() => void answer(knock.user.id, false)} title="ارفض" aria-label="ارفض">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </section>
                )}
                <section>
                  <h4 className="mb-2 text-xs text-gray-400">في الاجتماع ({participants.length})</h4>
                  {[me, ...ranked].map((participant) => (
                    <PersonRow key={participant.identity} participant={participant} isHostRow={participant.identity === hostId} hand={hands.has(participant.identity)}
                      canControl={isHost && !participant.isLocal} onMute={(track) => void hostAction('mute', participant.identity, track)} onRemove={() => setRemoveTarget(participant)} />
                  ))}
                </section>
                {notJoined.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs text-gray-400">مدعوين لسه مادخلوش ({notJoined.length})</h4>
                    {notJoined.map((person) => (
                      <div key={person.id} className="flex items-center gap-2 py-1.5">
                        <MeetAvatar id={person.id} name={person.displayName} />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">{person.displayName}</strong>
                          {person.jobTitle && <span className="block truncate text-xs text-gray-400">{person.jobTitle}</span>}
                        </span>
                      </div>
                    ))}
                  </section>
                )}
              </div>
            )}

            {panel === 'settings' && (
              <div className="p-4">
                <DeviceSelects prefs={prefs} setPrefs={setPrefs} tick={0} room={room} dark />
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-gray-800 px-3 py-3">
        <div className="flex items-center gap-2">
          <button type="button" className={control(micOn ? '' : 'off')} onClick={() => void toggle('mic')} disabled={busy.mic} title={micOn ? 'اقفل المايك' : 'افتح المايك'} aria-label={micOn ? 'اقفل المايك' : 'افتح المايك'} aria-pressed={!micOn}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button type="button" className={control(camOn ? '' : 'off')} onClick={() => void toggle('cam')} disabled={busy.cam} title={camOn ? 'اقفل الكاميرا' : 'افتح الكاميرا'} aria-label={camOn ? 'اقفل الكاميرا' : 'افتح الكاميرا'} aria-pressed={!camOn}>
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button type="button" className={control(sharing ? 'active' : '')} onClick={() => void toggle('screen')} disabled={busy.screen} title={sharing ? 'وقّف المشاركة' : 'شارك شاشتك'} aria-label={sharing ? 'وقّف المشاركة' : 'شارك شاشتك'} aria-pressed={sharing}>
            {sharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
          </button>
          <button type="button" className={control(myHandUp ? 'active' : '')} onClick={toggleHand} title={myHandUp ? 'نزّل إيدك' : 'ارفع إيدك'} aria-label={myHandUp ? 'نزّل إيدك' : 'ارفع إيدك'} aria-pressed={myHandUp}>
            <Hand size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={control(panel === 'chat' ? 'active' : '')} onClick={() => setPanel('chat')} title="دردشة الاجتماع" aria-label="دردشة الاجتماع">
            <MessageCircle size={20} />
            {unread > 0 && <span className="absolute -top-1 -end-1 rounded-full bg-red-600 px-1.5 text-[10px] leading-4">{unread > 99 ? '99+' : unread}</span>}
          </button>
          <button type="button" className={control(panel === 'people' ? 'active' : '')} onClick={() => setPanel('people')} title="المشاركين" aria-label="المشاركين">
            <Users size={20} />
            {isHost && knocks.length > 0
              ? <span className="absolute -top-1 -end-1 rounded-full bg-red-600 px-1.5 text-[10px] leading-4">{knocks.length}</span>
              : <span className="text-xs">{participants.length}</span>}
          </button>
          <button type="button" className={control(panel === 'settings' ? 'active' : '')} onClick={() => setPanel('settings')} title="الإعدادات" aria-label="الإعدادات">
            <Settings size={20} />
          </button>
        </div>
        <div className="relative flex items-center gap-2">
          <button type="button" className={control()} onClick={onMinimize} title="صغّر وكمّل شغلك" aria-label="صغّر وكمّل شغلك" data-meet-minimize>
            <Minus size={20} />
          </button>
          <button type="button" className={control('leave')} onClick={() => (isHost ? setLeaveMenu((open) => !open) : onLeave())} title="اخرج" data-meet-leave>
            <PhoneOff size={20} />
            <span className="text-sm">اخرج</span>
          </button>
          {leaveMenu && (
            <div className="absolute bottom-full end-0 mb-2 w-48 overflow-hidden rounded-xl bg-white text-sm text-gray-800 shadow-lg" role="menu">
              <button type="button" role="menuitem" className="block w-full px-4 py-2.5 text-start hover:bg-gray-50" onClick={onLeave}>اخرج إنت بس</button>
              <button type="button" role="menuitem" className="block w-full px-4 py-2.5 text-start text-red-600 hover:bg-red-50" onClick={() => { setLeaveMenu(false); setConfirmEnd(true) }}>
                إنهاء الاجتماع للكل
              </button>
            </div>
          )}
        </div>
      </footer>

      <div className="hidden" aria-hidden="true">
        {remotes.flatMap((participant) =>
          [...participant.audioTrackPublications.values()].map((publication) => (publication.track && publication.isSubscribed ? <AudioTrackPlayer key={publication.trackSid} track={publication.track} /> : null)))}
      </div>

      {confirmEnd && !minimized && (
        <MeetModal title="إنهاء الاجتماع للكل" onClose={() => setConfirmEnd(false)}
          footer={<>
            <button type="button" className="btn-danger" onClick={() => void endForAll()}>إنهاء الاجتماع للكل</button>
            <button type="button" className="btn-secondary" onClick={() => setConfirmEnd(false)}>إلغاء</button>
          </>}>
          <p>«{meeting.title}» هينتهي وكل اللي فيه هيخرجوا. متأكد؟</p>
        </MeetModal>
      )}
      {removeTarget && !minimized && (
        <MeetModal title="إخراج مشارك" onClose={() => setRemoveTarget(null)}
          footer={<>
            <button type="button" className="btn-danger" onClick={() => { const identity = removeTarget.identity; setRemoveTarget(null); void hostAction('remove', identity) }}>خرّجه</button>
            <button type="button" className="btn-secondary" onClick={() => setRemoveTarget(null)}>إلغاء</button>
          </>}>
          <p>{removeTarget.name || 'المشارك'} هيخرج من الاجتماع، وعشان يرجع لازم يطلب الدخول وإنت توافق.</p>
        </MeetModal>
      )}
    </div>
  )
}

function PersonRow({ participant, isHostRow, hand, canControl, onMute, onRemove }: {
  participant: Participant; isHostRow: boolean; hand: boolean; canControl: boolean; onMute: (track: 'audio' | 'video') => void; onRemove: () => void
}) {
  const name = participant.name || participant.identity
  const jobTitle = jobTitleOf(participant)
  return (
    <div className={`flex items-center gap-2 rounded-lg px-1 py-1.5 ${participant.isSpeaking ? 'bg-gray-800' : ''}`}>
      <MeetAvatar id={participant.identity} name={name} />
      <span className="min-w-0 flex-1">
        <strong className="flex items-center gap-1 truncate text-sm">
          <span className="truncate">{name}{participant.isLocal && ' (إنت)'}</span>
          {isHostRow && <Crown size={13} className="shrink-0 text-amber-300" />}
        </strong>
        {jobTitle && <span className="block truncate text-xs text-gray-400">{jobTitle}</span>}
      </span>
      {hand && <Hand size={16} className="shrink-0 text-amber-300" />}
      <SignalBars quality={participant.connectionQuality} />
      {canControl && participant.isMicrophoneEnabled ? (
        <button type="button" className={iconButton} onClick={() => onMute('audio')} title="اقفل مايكه" aria-label="اقفل مايكه">
          <Mic size={16} />
        </button>
      ) : participant.isMicrophoneEnabled ? <Mic size={16} className="shrink-0 text-gray-400" /> : <MicOff size={16} className="shrink-0 text-red-400" />}
      {canControl && participant.isCameraEnabled ? (
        <button type="button" className={iconButton} onClick={() => onMute('video')} title="اقفل كاميرته" aria-label="اقفل كاميرته">
          <Video size={16} />
        </button>
      ) : participant.isCameraEnabled ? <Video size={16} className="shrink-0 text-gray-400" /> : <VideoOff size={16} className="shrink-0 text-gray-500" />}
      {canControl && participant instanceof RemoteParticipant && (
        <button type="button" className={`${iconButton} text-red-400`} onClick={onRemove} title="خرّجه من الاجتماع" aria-label="خرّجه من الاجتماع">
          <DoorOpen size={16} />
        </button>
      )}
    </div>
  )
}
