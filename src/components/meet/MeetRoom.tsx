'use client'

// B-ADD.15: /meet/<الكود> — قبل الدخول (معاينة الكاميرا والمايك واختيار الأجهزة) ← طلب الدخول لو محتاج ← الغرفة.
// الاجتماع نفسه عند MeetSessionProvider (في الإطار الدائم)، فبيكمّل لو المستخدم ساب الصفحة دي: هنا الغرفة بتتعرض ملء الشاشة (المزوّد هو اللي
// بيعرضها)، وفي أي شاشة تانية بتكمّل في النافذة الصغيرة. الملف ده بيتحمّل في المتصفح بس (معاه livekit-client).
import { createLocalAudioTrack, createLocalVideoTrack, type LocalAudioTrack, type LocalVideoTrack, type Track, VideoPresets } from 'livekit-client'
import Link from 'next/link'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { DoorOpen, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { getCurrentUser } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import { MEET_BASE, MEET_INSECURE_TEXT, MEET_PRIVACY_TEXT } from '@/lib/meet-api'
import DeviceSelects from './DeviceSelects'
import { mediaBlockedHere, mediaErrorText } from './devices'
import { MeetModal } from './MeetBits'
import { type JoinMedia, LEFT_TEXT, type SessionPhase, useMeetSession } from './MeetSession'

const LOADING: SessionPhase = { k: 'loading' }

export default function MeetRoom({ id }: { id: string }) {
  const session = useMeetSession()
  const { prefs, setPrefs, open, abandon } = session
  // اجتماع تاني شغال في التبويب ده: اخرج منه الأول
  const otherLive = session.phase.k === 'room' && !!session.id && session.id !== id
  const mine = session.id === id
  const phase: SessionPhase = mine ? session.phase : LOADING
  const meeting = mine ? session.meeting : null
  const insecure = mediaBlockedHere()

  useEffect(() => {
    if (!otherLive) open(id)
  }, [id, otherLive, open])
  // الخروج من الصفحة قبل الغرفة: سيب الانتظار أو الاتصال (الغرفة نفسها بتكمّل)
  useEffect(() => () => abandon(id), [id, abandon])

  // ------------------------------------------------------------ المعاينة (قبل الدخول ووقت الانتظار)
  const previewing = !insecure && (phase.k === 'prejoin' || phase.k === 'knocking' || phase.k === 'denied' || phase.k === 'connecting')
  const [video, setVideo] = useState<LocalVideoTrack | null>(null)
  const [audio, setAudio] = useState<LocalAudioTrack | null>(null)
  const [camErr, setCamErr] = useState<string | null>(null)
  const [micErr, setMicErr] = useState<string | null>(null)
  const handedOver = useRef(new Set<Track>())
  const [devTick, setDevTick] = useState(0)
  const media = useRef({ video, audio, camErr, micErr })
  media.current = { video, audio, camErr, micErr }

  useEffect(() => {
    if (!previewing || !prefs.camOn) {
      setVideo(null)
      return
    }
    let cancelled = false
    let track: LocalVideoTrack | null = null
    createLocalVideoTrack({ deviceId: prefs.camId || undefined, resolution: VideoPresets.h720.resolution })
      .then((created) => {
        if (cancelled) return created.stop()
        track = created
        setVideo(created)
        setCamErr(null)
        setDevTick((value) => value + 1)
      })
      .catch((error) => {
        if (cancelled) return
        // كاميرا محفوظة ومابقتش موجودة: الافتراضية
        if (prefs.camId && (error as Error)?.name === 'OverconstrainedError') setPrefs({ camId: '' })
        else setCamErr(mediaErrorText(error, 'camera'))
      })
    return () => {
      cancelled = true
      if (track && !handedOver.current.has(track)) track.stop()
      setVideo(null)
    }
  }, [previewing, prefs.camOn, prefs.camId, setPrefs])

  useEffect(() => {
    if (!previewing || !prefs.micOn) {
      setAudio(null)
      return
    }
    let cancelled = false
    let track: LocalAudioTrack | null = null
    createLocalAudioTrack({ deviceId: prefs.micId || undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true })
      .then((created) => {
        if (cancelled) return created.stop()
        track = created
        setAudio(created)
        setMicErr(null)
        setDevTick((value) => value + 1)
      })
      .catch((error) => {
        if (cancelled) return
        if (prefs.micId && (error as Error)?.name === 'OverconstrainedError') setPrefs({ micId: '' })
        else setMicErr(mediaErrorText(error, 'mic'))
      })
    return () => {
      cancelled = true
      if (track && !handedOver.current.has(track)) track.stop()
      setAudio(null)
    }
  }, [previewing, prefs.micOn, prefs.micId, setPrefs])

  // ------------------------------------------------------------ الدخول (الجلسة هي اللي بتمشّيه)
  /** بيتقري لما الغرفة تجهز (وبعد موافقة صاحب الاجتماع كمان): كاميرا ومايك المعاينة بيدخلوا زي ما هم */
  const getMedia = useCallback((): JoinMedia => ({
    video: media.current.video, audio: media.current.audio, camErr: !!media.current.camErr, micErr: !!media.current.micErr,
    handOver: (tracks) => tracks.forEach((track) => handedOver.current.add(track)),
  }), [])

  const shell = (body: ReactNode) => <div className="mx-auto max-w-5xl">{body}</div>
  const message = (icon: ReactNode, title: string | undefined, text: string, actions: ReactNode) => shell(
    <div className="card mx-auto mt-8 max-w-lg p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">{icon}</div>
      {title && <h2 className="mb-2 text-xl font-bold text-gray-800">{title}</h2>}
      <p className="mb-6 text-gray-500">{text}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>
    </div>)
  const backToList = <Link href={MEET_BASE} className="btn-secondary">رجوع للاجتماعات</Link>

  if (otherLive) {
    return shell(
      <MeetModal title="إنت في اجتماع تاني" onClose={() => window.history.back()}
        footer={<>
          <button type="button" className="btn-danger" onClick={() => void session.leave()}>اخرج منه وادخل ده</button>
          <Link href={MEET_BASE} className="btn-secondary">إلغاء</Link>
        </>}>
        <p>إنت دلوقتي في «{session.meeting?.title ?? ''}». عشان تدخل الاجتماع ده لازم تخرج منه الأول.</p>
      </MeetModal>)
  }

  // جوه الغرفة: المزوّد بيعرضها ملء الشاشة فوق الصفحة دي
  if (phase.k === 'room') return null

  if (phase.k === 'loading' || phase.k === 'idle') {
    return shell(<div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" /></div>)
  }
  if (phase.k === 'error') return message(<VideoOff size={32} />, undefined, phase.text, backToList)
  if (phase.k === 'left') {
    const canRejoin = phase.reason === 'self' || phase.reason === 'lost' || phase.reason === 'duplicate'
    return message(phase.reason === 'lost' ? <VideoOff size={32} /> : <DoorOpen size={32} />, meeting?.title, LEFT_TEXT[phase.reason], <>
      {canRejoin && <button type="button" className="btn-primary" onClick={session.rejoin}>ادخل تاني</button>}
      {backToList}
    </>)
  }

  const current = meeting!
  const knock = current.access === 'knock'
  return shell(
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" data-meet-prejoin>
      <PreviewPane video={video} audio={audio} name={getCurrentUser()?.displayName ?? ''} camOn={prefs.camOn} micOn={prefs.micOn} error={insecure ? MEET_INSECURE_TEXT : camErr ?? micErr}
        starting={!insecure && !camErr} onToggleCam={() => setPrefs({ camOn: !prefs.camOn })} onToggleMic={() => setPrefs({ micOn: !prefs.micOn })} />
      <div className="card space-y-4 self-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{current.title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {current.isHost ? 'إنت صاحب الاجتماع' : `صاحب الاجتماع: ${current.host.displayName}`}
            {current.startsAt && ` · ${formatDateTime(current.startsAt)}`}
          </p>
        </div>
        <DeviceSelects prefs={prefs} setPrefs={setPrefs} tick={devTick} />
        {session.joinError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{session.joinError}</div>}
        {phase.k === 'knocking' ? (
          <div className="flex items-center gap-3 rounded-xl bg-primary-50 p-3" data-meet-waiting>
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <strong className="block text-sm text-gray-800">مستنيين صاحب الاجتماع يدخّلك</strong>
              <p className="text-xs text-gray-500">هتدخل لوحدك أول ما يوافق — سيب الصفحة دي مفتوحة</p>
            </div>
            <button type="button" className="rounded-lg bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100" onClick={session.cancelKnock}>إلغاء</button>
          </div>
        ) : phase.k === 'denied' ? (
          <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">صاحب الاجتماع ماوافقش على دخولك</div>
        ) : (
          <>
            {knock && <p className="text-xs text-gray-500">الاجتماع ده بغرفة انتظار وإنت مش من المدعوين: هتطلب الدخول وصاحب الاجتماع يوافق</p>}
            <button type="button" className="btn-primary w-full disabled:opacity-50" onClick={() => void session.join(getMedia)} disabled={phase.k === 'connecting'} data-meet-join>
              {phase.k === 'connecting' ? 'جاري الاتصال…' : knock ? 'اطلب الدخول' : 'ادخل دلوقتي'}
            </button>
          </>
        )}
        <p className="text-xs text-gray-400">{MEET_PRIVACY_TEXT}</p>
      </div>
    </div>)
}

/** معاينة الكاميرا بمؤشر صوت المايك وزرارين الفتح والقفل */
function PreviewPane({ video, audio, name, camOn, micOn, error, starting, onToggleCam, onToggleMic }: {
  video: LocalVideoTrack | null; audio: LocalAudioTrack | null; name: string; camOn: boolean; micOn: boolean; error: string | null; starting: boolean; onToggleCam: () => void; onToggleMic: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const meter = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !video) return
    video.attach(element)
    return () => {
      video.detach(element)
    }
  }, [video])

  // مستوى صوت المايك، مرسوم من غير إعادة رسم الصفحة
  useEffect(() => {
    if (!audio) return
    let context: AudioContext
    try {
      context = new AudioContext()
    } catch {
      return
    }
    const source = context.createMediaStreamSource(new MediaStream([audio.mediaStreamTrack]))
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const buffer = new Uint8Array(analyser.fftSize)
    let frame = 0
    const draw = () => {
      analyser.getByteTimeDomainData(buffer)
      let peak = 0
      for (let index = 0; index < buffer.length; index++) peak = Math.max(peak, Math.abs(buffer[index] - 128))
      meter.current?.style.setProperty('--lvl', String(Math.min(1, peak / 64)))
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(frame)
      void context.close()
    }
  }, [audio])

  const control = (on: boolean) => `inline-flex h-11 w-11 items-center justify-center rounded-full text-white ${on ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'}`
  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-gray-900">
        {video ? (
          <video ref={ref} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-gray-400">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-700 text-3xl text-white">{name.trim().slice(0, 1)}</span>
            <span className="text-sm">{camOn ? (starting ? 'بنشغّل الكاميرا…' : '') : 'الكاميرا مقفولة'}</span>
          </div>
        )}
        <span className="absolute bottom-3 start-3 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">{name}</span>
        {audio && (
          <span className="absolute bottom-3 end-3 h-1.5 w-20 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
            <span ref={meter} className="block h-full w-full origin-center rounded-full bg-green-400" style={{ transform: 'scaleX(var(--lvl, 0))' }} />
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button type="button" className={control(micOn)} onClick={onToggleMic} title={micOn ? 'اقفل المايك' : 'افتح المايك'} aria-label={micOn ? 'اقفل المايك' : 'افتح المايك'} aria-pressed={!micOn}>
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button type="button" className={control(camOn)} onClick={onToggleCam} title={camOn ? 'اقفل الكاميرا' : 'افتح الكاميرا'} aria-label={camOn ? 'اقفل الكاميرا' : 'افتح الكاميرا'} aria-pressed={!camOn}>
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>
      {!micOn && <p className="text-center text-xs text-gray-500">هتدخل والمايك مقفول</p>}
      {error && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800" data-meet-media-error>{error}</div>}
    </div>
  )
}
