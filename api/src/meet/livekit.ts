import { createHmac } from 'node:crypto'

// B-ADD.15: خادم الاجتماعات (LiveKit مفتوح المصدر، مستضاف عند الشركة) — من غير مكتبة: تذكرة الدخول JWT بـHS256 بتتوقّع هنا، وأوامر الغرفة
// (RoomService) نداءات Twirp عادية بـfetch. الإعداد من api/.env بس، ومفيش قيمة منه بتتطبع ولا بترجع في رد غير عنوان الخادم للمتصفح.
// مفيش تسجيل: خدمة التسجيل (Egress) مابتتنادهاش من أي مكان.

export interface LivekitConfig {
  /** عنوان الخادم للمتصفح (wss) */
  url: string
  /** عنوان أوامر الغرفة للخادم (http/https) */
  httpUrl: string
  key: string
  secret: string
}

const clean = (value: unknown) => String(value ?? '').trim().replace(/\/+$/, '')

/** الإعداد من البيئة، أو null لو ناقص (العنوان أو المفتاح أو السر) — LIVEKIT_HTTP_URL الغايب بيتاخد من LIVEKIT_URL (ws ← http، wss ← https) */
export function livekitConfig(env: Record<string, string | undefined> = process.env): LivekitConfig | null {
  const url = clean(env.LIVEKIT_URL), key = clean(env.LIVEKIT_API_KEY), secret = clean(env.LIVEKIT_API_SECRET)
  if (!key || !secret || !/^wss?:\/\/[^\s/]+/i.test(url)) return null
  const given = clean(env.LIVEKIT_HTTP_URL)
  const httpUrl = /^https?:\/\/[^\s/]+/i.test(given) ? given : url.replace(/^ws/i, 'http')
  return { url, httpUrl, key, secret }
}

const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** JWT بـHS256 بمفتاح وسر LiveKit: iss = المفتاح، وnbf = دلوقتي، وexp بعد المدة */
export function signLivekitJwt(config: Pick<LivekitConfig, 'key' | 'secret'>, claims: Record<string, unknown>, ttlSeconds: number, now: number = Date.now()): string {
  const at = Math.floor(now / 1000)
  const body = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ ...claims, iss: config.key, nbf: at, exp: at + ttlSeconds })}`
  return `${body}.${createHmac('sha256', config.secret).update(body).digest('base64url')}`
}

export const LIVEKIT_TOKEN_TTL_SECONDS = 2 * 60 * 60

/**
 * تذكرة دخول مشارك لغرفة واحدة (ساعتين): الهوية = رقم الحساب، والاسم والمسمى من النظام بس (canUpdateOwnMetadata مقفولة: محدش يغيّر اسمه)،
 * وroomAdmin لصاحب الاجتماع بس.
 */
export function participantToken(config: Pick<LivekitConfig, 'key' | 'secret'>, input: { room: string; identity: string; name: string; metadata: Record<string, unknown>; host: boolean },
  now: number = Date.now()): string {
  return signLivekitJwt(config, {
    sub: input.identity, jti: input.identity, name: input.name, metadata: JSON.stringify(input.metadata),
    video: { room: input.room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: false, roomAdmin: input.host },
  }, LIVEKIT_TOKEN_TTL_SECONDS, now)
}

export class LivekitError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message) }
  /** الغرفة أو المشارك مش موجود على الخادم */
  get notFound() { return this.status === 404 || this.code === 'not_found' }
}

const CALL_TIMEOUT_MS = 5000
const SERVICE_TOKEN_TTL_SECONDS = 600

/** نداء Twirp لـRoomService: POST {httpUrl}/twirp/livekit.RoomService/<Method> بـJSON وتذكرة خدمة قصيرة بالصلاحية المطلوبة بس */
export async function livekitCall<T>(config: LivekitConfig, method: string, body: Record<string, unknown>, grant: Record<string, unknown>, timeoutMs: number = CALL_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${config.httpUrl}/twirp/livekit.RoomService/${method}`, {
      method: 'POST', signal: controller.signal, body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signLivekitJwt(config, { video: grant }, SERVICE_TOKEN_TTL_SECONDS)}` },
    })
    const text = await response.text()
    let parsed: Record<string, unknown> = {}
    try { parsed = text ? JSON.parse(text) : {} } catch { /* رد مش JSON */ }
    if (!response.ok) throw new LivekitError(response.status, String(parsed.code ?? ''), String(parsed.msg ?? `LiveKit ${response.status}`))
    return parsed as T
  } catch (error) {
    if (error instanceof LivekitError) throw error
    throw new LivekitError(0, 'unreachable', (error as Error)?.message ?? 'unreachable')
  } finally {
    clearTimeout(timer)
  }
}

interface RoomInfo { name?: string; numParticipants?: number; num_participants?: number }
interface TrackInfo { sid?: string; source?: string | number; muted?: boolean }

// مصدر المسار في رد LiveKit: اسم (protojson) أو رقم
const SOURCES: Record<'audio' | 'video', ReadonlyArray<string | number>> = { audio: ['MICROPHONE', 2], video: ['CAMERA', 1] }

/** عدد الموجودين دلوقتي في الغرف المفتوحة على الخادم (اسم الغرفة ← العدد) */
export async function livekitRoomCounts(config: LivekitConfig, rooms: string[], timeoutMs?: number): Promise<Map<string, number>> {
  const reply = await livekitCall<{ rooms?: RoomInfo[] }>(config, 'ListRooms', { names: rooms }, { roomList: true }, timeoutMs)
  return new Map((reply.rooms ?? []).map((room) => [String(room.name ?? ''), Number(room.numParticipants ?? room.num_participants ?? 0)]))
}

/** قفل الغرفة: كل اللي جواها بيخرجوا */
export const livekitDeleteRoom = (config: LivekitConfig, room: string) => livekitCall(config, 'DeleteRoom', { room }, { roomCreate: true })

/** إخراج مشارك من الغرفة */
export const livekitRemoveParticipant = (config: LivekitConfig, room: string, identity: string) =>
  livekitCall(config, 'RemoveParticipant', { room, identity }, { roomAdmin: true, room })

/** كتم مايك أو كاميرا مشارك (المفتوح منهم بس) — بيرجّع عدد المسارات اللي اتكتمت. الفتح عن بعد مش ممكن: المشارك بيفتح لنفسه */
export async function livekitMuteParticipant(config: LivekitConfig, room: string, identity: string, track: 'audio' | 'video'): Promise<number> {
  const grant = { roomAdmin: true, room }
  const participant = await livekitCall<{ tracks?: TrackInfo[] }>(config, 'GetParticipant', { room, identity }, grant)
  const open = (participant.tracks ?? []).filter((item) => item.sid && !item.muted && SOURCES[track].includes(item.source as string | number))
  for (const item of open) await livekitCall(config, 'MutePublishedTrack', { room, identity, track_sid: item.sid, muted: true }, grant)
  return open.length
}
