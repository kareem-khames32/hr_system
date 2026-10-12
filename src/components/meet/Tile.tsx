'use client'

// B-ADD.15: مربع مشارك في الغرفة (كاميرته أو شاشته، أو دايرة اسمه)، ومشغّل صوت المشاركين. بيتحمّل مع الغرفة بس.
import { ConnectionQuality, type Participant, RemoteTrackPublication, Track, VideoQuality } from 'livekit-client'
import { type CSSProperties, useEffect, useRef } from 'react'
import { Crown, Hand, MicOff, Pin, ScreenShare, SignalHigh, SignalLow, SignalMedium, SignalZero } from 'lucide-react'
import { MeetAvatar } from './MeetBits'

export type TileSource = Track.Source.Camera | Track.Source.ScreenShare

export function qualityText(quality: ConnectionQuality): string {
  if (quality === ConnectionQuality.Excellent) return 'اتصال ممتاز'
  if (quality === ConnectionQuality.Good) return 'اتصال كويس'
  if (quality === ConnectionQuality.Poor) return 'اتصال ضعيف'
  if (quality === ConnectionQuality.Lost) return 'الاتصال مقطوع'
  return 'الاتصال غير معروف'
}

/** قوة الاتصال بشرطات */
export function SignalBars({ quality, size = 16 }: { quality: ConnectionQuality; size?: number }) {
  const Icon = quality === ConnectionQuality.Excellent ? SignalHigh : quality === ConnectionQuality.Good ? SignalMedium : quality === ConnectionQuality.Poor ? SignalLow : SignalZero
  return (
    <span title={qualityText(quality)} aria-label={qualityText(quality)} className={quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost ? 'text-amber-400' : 'text-green-400'}>
      <Icon size={size} />
    </span>
  )
}

export function Tile({ participant, source, hostId, hand, pinned, onPin, style, big }: {
  participant: Participant; source: TileSource; hostId: string; hand: boolean; pinned: boolean; onPin: () => void; style?: CSSProperties; big?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const publication = participant.getTrackPublication(source)
  const track = publication?.videoTrack
  const visible = !!track && !publication!.isMuted
  const screen = source === Track.Source.ScreenShare
  const name = participant.name || participant.identity

  useEffect(() => {
    const element = ref.current
    if (!element || !track || !visible) return
    track.attach(element)
    return () => {
      track.detach(element)
    }
  }, [track, visible])

  // شاشة حد تاني على المسرح: بأعلى جودة
  useEffect(() => {
    if (screen && publication instanceof RemoteTrackPublication && big) publication.setVideoQuality(VideoQuality.HIGH)
  }, [screen, publication, big])

  const speaking = participant.isSpeaking && !screen
  return (
    <div style={style} className={`group relative overflow-hidden rounded-xl bg-gray-800 ${speaking ? 'ring-2 ring-green-400' : ''} ${big ? 'h-full w-full' : ''}`}>
      {visible ? (
        <video ref={ref} autoPlay playsInline muted className={`h-full w-full ${screen ? 'object-contain' : 'object-cover'} ${participant.isLocal && !screen ? '-scale-x-100' : ''}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MeetAvatar id={participant.identity} name={name} size={big ? 96 : 64} />
        </div>
      )}
      <div className="absolute end-2 top-2 flex items-center gap-1">
        {hand && (
          <span title="رافع إيده" className="rounded-full bg-amber-400 p-1.5 text-gray-900">
            <Hand size={16} />
          </span>
        )}
        <button type="button" onClick={onPin} title={pinned ? 'شيل التثبيت' : 'ثبّت على الشاشة'} aria-label={pinned ? 'شيل التثبيت' : 'ثبّت على الشاشة'}
          className={`rounded-full p-1.5 text-white transition-opacity ${pinned ? 'bg-primary-500' : 'bg-black/50 opacity-0 focus:opacity-100 group-hover:opacity-100'}`}>
          <Pin size={15} />
        </button>
      </div>
      <div className="absolute bottom-2 start-2 flex max-w-[90%] items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">
        {participant.identity === hostId && <Crown size={13} className="shrink-0 text-amber-300" />}
        {!screen && !participant.isMicrophoneEnabled && <MicOff size={14} className="shrink-0 text-red-400" />}
        {screen && <ScreenShare size={14} className="shrink-0" />}
        <span className="truncate">
          {screen ? `شاشة ${name}` : name}
          {participant.isLocal && !screen ? ' (إنت)' : ''}
        </span>
        {!screen && <SignalBars quality={participant.connectionQuality} size={14} />}
      </div>
    </div>
  )
}

/** بيشغّل صوت مشارك (مايكه أو صوت شاشته) */
export function AudioTrackPlayer({ track }: { track: Track }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    track.attach(element)
    return () => {
      track.detach(element)
    }
  }, [track])
  return <audio ref={ref} autoPlay />
}
