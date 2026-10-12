'use client'

// B-ADD.15: الاجتماع اللي التبويب جواه — فوق الصفحات (في الإطار الدائم)، فبيكمّل مع التنقل بين الشاشات: صفحة /meet/<الكود> مجرد عرض له
// (قبل الدخول، الانتظار، الغرفة كاملة)، وفي أي شاشة تانية الاجتماع بيكمّل في نافذة صغيرة في ركن الشاشة. مكتبة livekit-client برّه حزمة النظام
// الأساسية: بتتحمّل مع الدخول، وشاشة الغرفة حزمة لوحدها.
import type { DisconnectReason, LocalAudioTrack, LocalVideoTrack, Room, Track } from 'livekit-client'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cancelKnock as cancelKnockCall, fetchKnockState, fetchMeeting, fetchMeetingToken, knockMeeting, meetErrorCode, meetErrorText, meetPath, type MeetingDetail } from '@/lib/meet-api'
import { loadPrefs, type MeetPrefs, savePrefs } from './devices'
import { meetNotify, setActiveMeeting } from './meetState'

const RoomView = dynamic(() => import('./RoomView'), { ssr: false })
const MeetLiveWindow = dynamic(() => import('./MeetLiveWindow'), { ssr: false })

/** اللي مستني موافقة صاحب الاجتماع بيسأل كل كام ثانية (والسؤال نفسه بيقول للخادم إنه لسه مستني) */
const KNOCK_POLL_MS = 3000

export type LeftReason = 'self' | 'ended' | 'removed' | 'duplicate' | 'lost'

export type SessionPhase =
  | { k: 'idle' }
  | { k: 'loading' }
  | { k: 'error'; text: string }
  | { k: 'prejoin' }
  | { k: 'knocking' }
  | { k: 'denied' }
  | { k: 'connecting' }
  | { k: 'room'; room: Room; host: boolean }
  | { k: 'left'; reason: LeftReason }

/** كاميرا ومايك المعاينة (قبل الدخول): بيتقروا لما الغرفة تجهز، وhandOver بيمنع الصفحة توقّفهم */
export interface JoinMedia {
  video: LocalVideoTrack | null
  audio: LocalAudioTrack | null
  camErr: boolean
  micErr: boolean
  handOver: (tracks: Track[]) => void
}

interface State {
  id: string | null
  meeting: MeetingDetail | null
  phase: SessionPhase
  joinError: string | null
  joinedAt: number
}

export interface MeetSession extends State {
  prefs: MeetPrefs
  setPrefs: (prefs: Partial<MeetPrefs>) => void
  /** صفحة الاجتماع اتفتحت: حمّله واعرض «قبل الدخول» (من غير أثر لو التبويب جواه أصلًا) */
  open: (id: string) => void
  /** «ادخل تاني» بعد الخروج */
  rejoin: () => void
  join: (getMedia: () => JoinMedia) => Promise<void>
  cancelKnock: () => void
  /** صفحة الاجتماع اتقفلت قبل الغرفة: سيب الانتظار أو الاتصال */
  abandon: (id: string) => void
  leave: () => Promise<void>
  minimize: () => void
  expand: () => void
}

const IDLE: State = { id: null, meeting: null, phase: { k: 'idle' }, joinError: null, joinedAt: 0 }

const Context = createContext<MeetSession | null>(null)

export function useMeetSession(): MeetSession {
  const session = useContext(Context)
  if (!session) throw new Error('useMeetSession outside MeetSessionProvider')
  return session
}
/** null برّه المزوّد (موديول الاجتماعات مقفول) */
export const useOptionalMeetSession = (): MeetSession | null => useContext(Context)

export const LEFT_TEXT: Record<LeftReason, string> = {
  self: 'خرجت من الاجتماع',
  ended: 'صاحب الاجتماع أنهاه',
  removed: 'صاحب الاجتماع خرّجك من الاجتماع',
  duplicate: 'دخلت الاجتماع من مكان تاني بنفس الحساب',
  lost: 'الاتصال بالاجتماع اتقطع',
}
const CONNECT_FAILED = 'تعذر الاتصال بخادم الاجتماعات — جرّب تاني'

export function MeetSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''

  const [state, setState] = useState<State>(IDLE)
  const stateRef = useRef(state)
  const update = useCallback((patch: Partial<State>) => {
    stateRef.current = { ...stateRef.current, ...patch }
    setState(stateRef.current)
  }, [])

  const [prefs, setPrefsState] = useState<MeetPrefs>(loadPrefs)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const setPrefs = useCallback((patch: Partial<MeetPrefs>) => {
    setPrefsState((old) => {
      const next = { ...old, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const roomRef = useRef<Room | null>(null)
  /** بيزيد كل ما اللي مستنيينه (تحميل، انتظار، اتصال) مابقاش يهم */
  const gen = useRef(0)
  const mediaRef = useRef<(() => JoinMedia) | null>(null)
  const onPage = !!state.id && pathname === meetPath(state.id)
  const onPageRef = useRef(onPage)
  onPageRef.current = onPage
  const routerRef = useRef(router)
  routerRef.current = router

  /** الغرفة راحت (خروج، إنهاء، إخراج، انقطاع): مرة واحدة لكل غرفة */
  const teardown = useCallback((room: Room, reason: LeftReason) => {
    if (roomRef.current !== room) return
    roomRef.current = null
    setActiveMeeting(null)
    if (onPageRef.current) update({ phase: { k: 'left', reason } })
    else {
      // متصغّر: مفيش صفحة تعرض «خرجت»، النافذة بتتقفل بس (بكلمة لو مش بإيدينا)
      gen.current++
      update(IDLE)
      if (reason !== 'self') meetNotify(LEFT_TEXT[reason])
    }
  }, [update])

  /** بيسيب الغرفة من غير شاشة «خرجت» (تبديل اجتماع، أو الإطار اتقفل) */
  const dropRoom = useCallback(() => {
    const room = roomRef.current
    roomRef.current = null
    if (!room) return
    room.removeAllListeners()
    void room.disconnect()
    setActiveMeeting(null)
  }, [])

  const load = useCallback((id: string, generation: number, after?: (meeting: MeetingDetail) => void) =>
    fetchMeeting(id).then((meeting) => {
      if (gen.current !== generation) return
      update({ meeting })
      if (after) after(meeting)
      else if (meeting.status === 'ended' || meeting.status === 'cancelled') update({ phase: { k: 'error', text: meeting.status === 'cancelled' ? 'الاجتماع ده اتلغى' : 'الاجتماع ده انتهى' } })
      else update({ phase: { k: 'prejoin' } })
    }).catch((error) => {
      if (gen.current === generation) update({ phase: { k: 'error', text: meetErrorText(error, 'تعذر تحميل الاجتماع') } })
    }), [update])

  const open = useCallback((id: string) => {
    const current = stateRef.current
    if (current.id === id && (current.phase.k === 'room' || current.phase.k === 'connecting' || current.phase.k === 'knocking')) return
    dropRoom()
    const generation = ++gen.current
    mediaRef.current = null
    update({ ...IDLE, id, phase: { k: 'loading' } })
    void load(id, generation)
  }, [dropRoom, load, update])

  const rejoin = useCallback(() => {
    const id = stateRef.current.id
    if (!id) return
    const generation = ++gen.current
    void load(id, generation, (meeting) => update({ joinError: null, phase: meeting.status === 'ended' || meeting.status === 'cancelled' ? { k: 'left', reason: 'ended' } : { k: 'prejoin' } }))
  }, [load, update])

  const join = useCallback(async (getMedia: () => JoinMedia) => {
    const id = stateRef.current.id
    if (!id) return
    mediaRef.current = getMedia
    const generation = gen.current
    const stale = () => gen.current !== generation || stateRef.current.id !== id
    update({ joinError: null, phase: { k: 'connecting' } })

    let lk: typeof import('livekit-client')
    try {
      lk = await import('livekit-client')
    } catch {
      if (!stale()) update({ joinError: CONNECT_FAILED, phase: { k: 'prejoin' } })
      return
    }

    let ticket: { token: string; url: string; host: boolean }
    try {
      ticket = await fetchMeetingToken(id)
    } catch (error) {
      if (stale()) return
      if (meetErrorCode(error) === 'MEET_KNOCK_REQUIRED') {
        try {
          const knock = await knockMeeting(id)
          if (stale()) return
          if (knock.admitted) return void setTimeout(() => mediaRef.current && void joinRef.current(mediaRef.current), 0)
          update({ phase: { k: 'knocking' } })
        } catch (second) {
          if (!stale()) update({ joinError: meetErrorText(second, CONNECT_FAILED), phase: { k: 'prejoin' } })
        }
        return
      }
      update({ joinError: meetErrorText(error, CONNECT_FAILED), phase: { k: 'prejoin' } })
      return
    }
    if (stale()) return

    const chosen = prefsRef.current
    const room = new lk.Room({
      adaptiveStream: true,
      dynacast: true,
      // قفل التبويب = خروج من الاجتماع
      disconnectOnPageLeave: true,
      publishDefaults: { simulcast: true, videoCodec: 'vp8', dtx: true, red: true },
      videoCaptureDefaults: { deviceId: chosen.camId || undefined, resolution: lk.VideoPresets.h720.resolution },
      audioCaptureDefaults: { deviceId: chosen.micId || undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      audioOutput: chosen.outId ? { deviceId: chosen.outId } : undefined,
    })
    dropRoom()
    roomRef.current = room
    const reasons = lk.DisconnectReason
    room.once(lk.RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      teardown(room, reason === reasons.CLIENT_INITIATED ? 'self'
        : reason === reasons.ROOM_DELETED || reason === reasons.ROOM_CLOSED ? 'ended'
          : reason === reasons.PARTICIPANT_REMOVED ? 'removed'
            : reason === reasons.DUPLICATE_IDENTITY ? 'duplicate' : 'lost')
    })
    try {
      await room.connect(ticket.url, ticket.token, { autoSubscribe: true })
    } catch (error) {
      if (roomRef.current === room) roomRef.current = null
      room.removeAllListeners()
      await room.disconnect().catch(() => undefined)
      if (!stale()) update({ joinError: CONNECT_FAILED, phase: { k: 'prejoin' } })
      console.warn('meet: connect failed', error)
      return
    }
    // الصفحة اتقفلت وهو بيتصل
    if (stale() || roomRef.current !== room) {
      if (roomRef.current === room) roomRef.current = null
      room.removeAllListeners()
      void room.disconnect()
      return
    }
    setActiveMeeting(id)
    // كاميرا ومايك المعاينة بيدخلوا الغرفة زي ما هم (من غير طلب إذن تاني ولا رعشة)
    const media = mediaRef.current?.() ?? { video: null, audio: null, camErr: false, micErr: false, handOver: () => undefined }
    mediaRef.current = null
    const video = media.video, audio = media.audio
    media.handOver([video, audio].filter((track): track is LocalVideoTrack | LocalAudioTrack => !!track))
    update({ phase: { k: 'room', room, host: ticket.host }, joinedAt: Date.now() })
    try {
      if (audio) await room.localParticipant.publishTrack(audio, { source: lk.Track.Source.Microphone })
      if (video) await room.localParticipant.publishTrack(video, { source: lk.Track.Source.Camera, simulcast: true })
      // المعاينة كانت لسه بتبدأ: محاولة تانية جوه الغرفة
      if (!audio && chosen.micOn && !media.micErr) await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined)
      if (!video && chosen.camOn && !media.camErr) await room.localParticipant.setCameraEnabled(true).catch(() => undefined)
    } catch (error) {
      console.warn('meet: publish failed', error)
    }
  }, [dropRoom, teardown, update])
  const joinRef = useRef(join)
  joinRef.current = join

  const cancelKnock = useCallback(() => {
    const id = stateRef.current.id
    if (id) cancelKnockCall(id).catch(() => undefined)
    gen.current++
    update({ phase: { k: 'prejoin' } })
  }, [update])

  const abandon = useCallback((id: string) => {
    const current = stateRef.current
    if (current.id !== id || current.phase.k === 'room') return
    gen.current++
    mediaRef.current = null
    if (current.phase.k === 'knocking') cancelKnockCall(id).catch(() => undefined)
    dropRoom()
    update(IDLE)
  }, [dropRoom, update])

  const leave = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    await room.disconnect().catch(() => undefined)
    teardown(room, 'self')
  }, [teardown])

  // تصغير: الاجتماع بيكمّل في النافذة الصغيرة، والمستخدم بيرجع للوحته
  const minimize = useCallback(() => {
    if (stateRef.current.phase.k === 'room') routerRef.current.push('/')
  }, [])

  const expand = useCallback(() => {
    const id = stateRef.current.id
    if (id) routerRef.current.push(meetPath(id))
  }, [])

  // ------------------------------------------------------------ الانتظار: النظام من غير اتصال لحظي، فاللي مستني بيسأل
  const phaseKind = state.phase.k
  useEffect(() => {
    const id = state.id
    if (phaseKind !== 'knocking' || !id) return
    const generation = gen.current
    const waiting = () => gen.current === generation && stateRef.current.id === id && stateRef.current.phase.k === 'knocking'
    const timer = setInterval(() => {
      fetchKnockState(id).then((reply) => {
        if (!waiting()) return
        if (reply.state === 'admitted') { if (mediaRef.current) void joinRef.current(mediaRef.current) }
        else if (reply.state === 'denied') update({ phase: { k: 'denied' } })
        // الخادم مش فاكر الطلب (اتعاد تشغيله، أو التبويب نام): اطلب تاني
        else if (reply.state === 'none') knockMeeting(id).catch(() => undefined)
      }).catch((error) => {
        const code = meetErrorCode(error)
        if (waiting() && (code === 'MEET_ENDED' || code === 'MEET_CANCELLED')) update({ phase: { k: 'error', text: meetErrorText(error, 'الاجتماع ده انتهى') } })
      })
    }, KNOCK_POLL_MS)
    return () => clearInterval(timer)
  }, [phaseKind, state.id, update])

  // الإطار اتقفل (خروج من النظام، أو الموديول اتقفل): الاجتماع بينتهي في التبويب ده
  useEffect(() => () => {
    gen.current++
    dropRoom()
  }, [dropRoom])

  const value = useMemo<MeetSession>(
    () => ({ ...state, prefs, setPrefs, open, rejoin, join, cancelKnock, abandon, leave, minimize, expand }),
    [state, prefs, setPrefs, open, rejoin, join, cancelKnock, abandon, leave, minimize, expand],
  )

  const phase = state.phase
  return (
    <Context.Provider value={value}>
      {children}
      {phase.k === 'room' && state.meeting && (
        <>
          {/* بتفضل مركّبة وهي متصغّرة: الدردشة ورفع الإيد وصوت المشاركين مكمّلين */}
          <RoomView key={`${state.id}:${state.joinedAt}`} room={phase.room} meeting={state.meeting} isHost={phase.host} prefs={prefs} setPrefs={setPrefs} joinedAt={state.joinedAt}
            minimized={!onPage} onMinimize={minimize} onLeave={() => void leave()} />
          {!onPage && <MeetLiveWindow room={phase.room} title={state.meeting.title} joinedAt={state.joinedAt} onExpand={expand} onLeave={() => void leave()} />}
        </>
      )}
    </Context.Provider>
  )
}
