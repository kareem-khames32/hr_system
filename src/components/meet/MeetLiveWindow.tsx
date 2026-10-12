'use client'

// B-ADD.15: الاجتماع اللي التبويب جواه وهو متصغّر — نافذة صغيرة في ركن الشاشة: اللي بيتكلم، والعنوان، والوقت، وعدد المشاركين، وأزرار المايك
// والكاميرا والرجوع للغرفة والخروج. الجلسة نفسها (والصوت) عند MeetSessionProvider؛ النافذة دي بتعرضها بس.
// B-ADD.23: ونفس النافذة هي المكالمة بين اتنين (call): مالهاش غرفة ملء الشاشة، فصوت الطرف التاني بيتشغّل هنا، ومن غير «ارجع للاجتماع».
import { type Participant, type Room, RoomEvent, Track } from 'livekit-client'
import { useEffect, useRef, useState } from 'react'
import { Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff, Volume2 } from 'lucide-react'
import { mediaErrorText } from './devices'
import { MeetAvatar } from './MeetBits'
import { meetNotify } from './meetState'
import { Elapsed } from './RoomView'
import { AudioTrackPlayer } from './Tile'

const REDRAW = [
  RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackPublished, RoomEvent.TrackUnpublished, RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
  RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.ParticipantNameChanged, RoomEvent.AudioPlaybackStatusChanged,
] as const

const control = (off: boolean) => `inline-flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-50 ${off ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`

export default function MeetLiveWindow({ room, title, joinedAt, onExpand, onLeave, call = false }: { room: Room; title: string; joinedAt: number; onExpand: () => void; onLeave: () => void; call?: boolean }) {
  const [, setTick] = useState(0)
  const lastSpoke = useRef(new Map<string, number>())
  const [reconnecting, setReconnecting] = useState(false)
  const [busy, setBusy] = useState<{ mic?: boolean; cam?: boolean }>({})

  useEffect(() => {
    const bump = () => setTick((value) => value + 1)
    const onSpeakers = (speakers: Participant[]) => {
      const now = Date.now()
      for (const speaker of speakers) lastSpoke.current.set(speaker.identity, now)
      bump()
    }
    const onReconnecting = () => setReconnecting(true)
    const onReconnected = () => setReconnecting(false)
    for (const event of REDRAW) room.on(event, bump)
    room.on(RoomEvent.ActiveSpeakersChanged, onSpeakers)
    room.on(RoomEvent.Reconnecting, onReconnecting)
    room.on(RoomEvent.SignalReconnecting, onReconnecting)
    room.on(RoomEvent.Reconnected, onReconnected)
    return () => {
      for (const event of REDRAW) room.off(event, bump)
      room.off(RoomEvent.ActiveSpeakersChanged, onSpeakers)
      room.off(RoomEvent.Reconnecting, onReconnecting)
      room.off(RoomEvent.SignalReconnecting, onReconnecting)
      room.off(RoomEvent.Reconnected, onReconnected)
    }
  }, [room])

  const me = room.localParticipant
  const micOn = me.isMicrophoneEnabled
  const camOn = me.isCameraEnabled
  const remotes = [...room.remoteParticipants.values()]
  // مين يتعرض: آخر واحد اتكلم، وبعده حد كاميرته مفتوحة؛ ولو لوحدي: أنا
  const speaker: Participant = [...remotes].sort((a, b) => {
    const spoke = (lastSpoke.current.get(b.identity) ?? 0) - (lastSpoke.current.get(a.identity) ?? 0)
    return spoke || Number(b.isCameraEnabled) - Number(a.isCameraEnabled)
  })[0] ?? me

  const toggle = async (kind: 'mic' | 'cam') => {
    if (busy[kind]) return
    setBusy((current) => ({ ...current, [kind]: true }))
    try {
      if (kind === 'mic') await me.setMicrophoneEnabled(!micOn)
      else await me.setCameraEnabled(!camOn)
    } catch (error) {
      const text = mediaErrorText(error, kind === 'mic' ? 'mic' : 'camera')
      if (text) meetNotify(text, 'danger')
    } finally {
      setBusy((current) => ({ ...current, [kind]: false }))
    }
  }

  return (
    <section className="fixed bottom-4 end-4 z-[65] w-64 overflow-hidden rounded-2xl bg-gray-900 text-white shadow-2xl" aria-label={call ? 'المكالمة الشغالة' : 'الاجتماع الشغال'} data-meet-live={call ? 'call' : 'meeting'}>
      {/* المكالمة: صوت الطرف التاني من هنا (في الاجتماع الغرفة المتصغّرة هي اللي بتشغّله) */}
      {call && remotes.flatMap((participant) =>
        [...participant.audioTrackPublications.values()].map((publication) => (publication.track && publication.isSubscribed ? <AudioTrackPlayer key={publication.trackSid} track={publication.track} /> : null)))}
      <div className="relative h-36 bg-gray-800" onDoubleClick={call ? undefined : onExpand}>
        <SpeakerVideo key={speaker.identity} participant={speaker} />
        <span className="absolute bottom-1.5 start-1.5 flex max-w-[90%] items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs">
          {!speaker.isMicrophoneEnabled && <MicOff size={13} className="shrink-0 text-red-400" />}
          <span className="truncate">{speaker.name || speaker.identity}{speaker.isLocal ? ' (إنت)' : ''}</span>
        </span>
        {reconnecting && <span className="absolute end-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-gray-900">بيعيد الاتصال…</span>}
        {!room.canPlaybackAudio && (
          <button type="button" className="absolute inset-x-2 top-2 inline-flex items-center justify-center gap-1 rounded-lg bg-gray-700 px-2 py-1 text-xs" onClick={() => void room.startAudio()}>
            <Volume2 size={14} /> دوس عشان تسمع الصوت
          </button>
        )}
      </div>
      <div className="px-3 pt-2">
        <strong className="block truncate text-sm" title={title}>{title}</strong>
        <span className="text-xs text-gray-400">
          <Elapsed since={joinedAt} /> · {call ? (remotes.length ? 'مكالمة صوت — الكاميرا بإيدك' : 'مستنيين الطرف التاني يدخل…') : `${remotes.length + 1} مشارك`}
        </span>
      </div>
      <div className="flex items-center justify-center gap-2 p-3">
        <button type="button" className={control(!micOn)} onClick={() => void toggle('mic')} disabled={busy.mic} title={micOn ? 'اقفل المايك' : 'افتح المايك'} aria-label={micOn ? 'اقفل المايك' : 'افتح المايك'} aria-pressed={!micOn}>
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button type="button" className={control(!camOn)} onClick={() => void toggle('cam')} disabled={busy.cam} title={camOn ? 'اقفل الكاميرا' : 'افتح الكاميرا'} aria-label={camOn ? 'اقفل الكاميرا' : 'افتح الكاميرا'} aria-pressed={!camOn}>
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
        {!call && (
          <button type="button" className={control(false)} onClick={onExpand} title="ارجع للاجتماع" aria-label="ارجع للاجتماع" data-meet-expand>
            <Maximize2 size={18} />
          </button>
        )}
        <button type="button" className={control(true)} onClick={onLeave} title={call ? 'اقفل المكالمة' : 'اخرج'} aria-label={call ? 'اقفل المكالمة' : 'اخرج'} data-meet-hangup={call ? '' : undefined}>
          <PhoneOff size={18} />
        </button>
      </div>
    </section>
  )
}

/** كاميرا مشارك واحد، أو دايرة اسمه — الفيديو الوحيد اللي شغال هنا */
function SpeakerVideo({ participant }: { participant: Participant }) {
  const ref = useRef<HTMLVideoElement>(null)
  const publication = participant.getTrackPublication(Track.Source.Camera)
  const track = publication?.videoTrack
  const visible = !!track && !publication!.isMuted

  useEffect(() => {
    const element = ref.current
    if (!element || !track || !visible) return
    track.attach(element)
    return () => {
      track.detach(element)
    }
  }, [track, visible])

  if (!visible) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <MeetAvatar id={participant.identity} name={participant.name || participant.identity} size={72} />
      </div>
    )
  }
  return <video ref={ref} autoPlay playsInline muted className={`h-full w-full object-cover ${participant.isLocal ? '-scale-x-100' : ''}`} />
}
