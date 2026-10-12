// B-ADD.15: الاجتماعات — نداءات الخادم وأنواعها. الملف ده من غير livekit-client (مكتبة الغرفة بتتحمّل لما اجتماع يتفتح بس).
import { ApiError, apiFetch } from './api'
import type { StoredAudience } from './org-audience'

export const MEET_BASE = '/meet'
export const meetPath = (id: string) => `${MEET_BASE}/${id}`

export type MeetStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

/** اللي بيظهر من حساب: الاسم والمسمى الوظيفي بس */
export interface MeetPerson { id: number; displayName: string; jobTitle: string | null; /** أسماء تانية للبحث بس (اسم الحساب، الاسم بالإنجليزي) */ alias?: string | null }

export interface MeetingSummary {
  id: string; title: string; startsAt: string | null; createdAt: string; endedAt: string | null; cancelledAt: string | null; status: MeetStatus
  host: MeetPerson; isHost: boolean; inviteCount: number; participants: number
}

export interface MeetingDetail {
  id: string; title: string; startsAt: string | null; createdAt: string; endedAt: string | null; cancelledAt: string | null; status: MeetStatus; lobby: boolean
  host: MeetPerson; isHost: boolean
  /** الحساب ده يدخل على طول، ولا يطلب الدخول */
  access: 'host' | 'invited' | 'open' | 'knock'
  /** لصاحب الاجتماع والمدعوين */
  invitees?: MeetPerson[]
  /** لصاحب الاجتماع */
  knocks?: Array<{ user: MeetPerson; at: string }>
  attendance?: Array<{ userId: number; displayName: string; joinedAt: string }>
}

export interface MeetRing { id: string; title: string; startsAt: string | null; createdAt: string; host: MeetPerson; isHost: boolean }
export interface MeetKnock { meetingId: string; title: string; user: MeetPerson; at: string }
export interface MeetDecline { meetingId: string; title: string; user: MeetPerson; at: string }
/** صندوق الاجتماعات: الواجهة بتسأله كل كام ثانية (النظام من غير اتصال لحظي) — ومعاه المكالمات اللي بترن عند الحساب (B-ADD.23) */
export interface MeetInbox { ready: boolean; configured: boolean; invites: MeetRing[]; knocks: MeetKnock[]; declines: MeetDecline[]; calls?: CallRing[] }

// B-ADD.23: الاتصال من جوه النظام — مكالمة بين اتنين على نفس خادم الاجتماعات
export const CALLS_PATH = `${MEET_BASE}/calls`
/** الطرف التاني في المكالمة: الاسم والمسمى ورقم تحويلته بس */
export interface CallPerson extends MeetPerson { extension: string | null }
export type CallState = 'ringing' | 'active' | 'answered' | 'missed' | 'rejected'
export interface CallRing { id: string; startedAt: string; from: CallPerson }
export interface CallEntry {
  id: string; direction: 'in' | 'out'; state: CallState; person: CallPerson
  startedAt: string; answeredAt: string | null; endedAt: string | null; durationSeconds: number | null
}
export interface CallList { ready: boolean; configured: boolean; extensions: boolean; ringSeconds: number; calls: CallEntry[] }
export type CallTarget = { extension: string } | { userId: number }
export const CALL_NOT_READY_TEXT = 'الاتصال محتاج ترحيل 20261012_198 على قاعدة البيانات'
export const CALL_PRIVACY_TEXT = 'مفيش أي مكالمة بتتسجّل: لا صوت ولا صورة — النظام بيحفظ مين اتصل بمين وإمتى ومدتها بس'
export interface MeetingBody { title?: string; startsAt?: string | null; lobby?: boolean; inviteUserIds?: number[]; audience?: StoredAudience }
/** B-ADD.22: رد الإنشاء — ومع الدعوة بالفلاتر: كام اتدعى، وكام موظف في الجمهور، وكام منهم من غير حساب نشط (مااتدعاش) */
export interface MeetingCreated { id: string; invited?: number; audience?: { employees: number; withoutAccount: number } }
/** صلاحيات شاشات تحديد الجمهور (ORG_AUDIENCE_PERMS في الخادم): اللي معاه واحدة بيدعو بالفلاتر — والخادم هو اللي بيحكم */
export const MEET_AUDIENCE_PERMS = ['announcements.manage', 'policies.manage', 'helpdesk.manage', 'surveys.manage', 'settings.modules', 'settings.manage',
  'performance.manage', 'training.manage', 'tasks.manage', 'tasks.assign_any', 'employees.view', 'attendance.manage']
/** كلمة ما بعد الإنشاء بالفلاتر: «اتدعى N — وM موظف من غير حساب مااتدعوش» */
export function meetInvitedText(created: MeetingCreated): string {
  if (created.invited === undefined) return ''
  const skipped = created.audience?.withoutAccount ?? 0
  return `اتدعى ${created.invited}${skipped > 0 ? ` — و${skipped} موظف من غير حساب على النظام مااتدعوش` : ''}`
}

export const MEET_NOT_CONFIGURED_TEXT = 'الاجتماعات لسه ماتظبطتش'
export const MEET_NOT_READY_TEXT = 'الاجتماعات محتاجة ترحيل 20261012_191 على قاعدة البيانات'
export const MEET_INSECURE_TEXT = 'الكاميرا والمايك مابيشتغلوش غير على رابط آمن (https) — افتح النظام من رابطه الآمن'
export const MEET_PRIVACY_TEXT = 'مفيش أي اجتماع بيتسجّل: لا صوت ولا صورة ولا دردشة — النظام بيحفظ الاجتماع والمدعوين ووقت الدخول بس'

/** كود خطأ الخادم (MEET_KNOCK_REQUIRED، MEET_ENDED…) */
export const meetErrorCode = (error: unknown): string => (error instanceof ApiError ? String(error.details?.code ?? '') : '')
export const meetErrorText = (error: unknown, fallback: string): string => (error instanceof Error && error.message ? error.message : fallback)

const R = `${MEET_BASE}/rooms`
const post = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const fetchMeetInbox = () => apiFetch<MeetInbox>(`${MEET_BASE}/inbox`)
export const fetchMeetDirectory = () => apiFetch<{ users: MeetPerson[] }>(`${MEET_BASE}/directory`)
export const fetchMeetings = () => apiFetch<{ ready: boolean; configured: boolean; meetings: MeetingSummary[] }>(R)
export const fetchMeeting = (id: string) => apiFetch<MeetingDetail>(`${R}/${id}`)
export const createMeeting = (body: MeetingBody) => post<MeetingCreated>(R, body)
export const updateMeeting = (id: string, body: MeetingBody) => apiFetch<{ ok: true }>(`${R}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const cancelMeeting = (id: string) => apiFetch<{ ok: true }>(`${R}/${id}`, { method: 'DELETE' })
export const endMeeting = (id: string) => post<{ ok: true }>(`${R}/${id}/end`)
/** تذكرة الدخول وعنوان خادم الاجتماعات (وبيتسجّل الحضور) */
export const fetchMeetingToken = (id: string) => post<{ token: string; url: string; host: boolean }>(`${R}/${id}/token`)
export const knockMeeting = (id: string) => post<{ admitted?: boolean; waiting?: boolean }>(`${R}/${id}/knock`)
export const fetchKnockState = (id: string) => apiFetch<{ state: 'admitted' | 'waiting' | 'denied' | 'none' }>(`${R}/${id}/knock`)
export const cancelKnock = (id: string) => apiFetch<{ ok: true }>(`${R}/${id}/knock`, { method: 'DELETE' })
export const answerKnock = (id: string, userId: number, admit: boolean) => post<{ ok: true }>(`${R}/${id}/${admit ? 'admit' : 'deny'}`, { userId })
export const declineMeeting = (id: string) => post<{ ok: true }>(`${R}/${id}/decline`)
export const muteParticipant = (id: string, userId: number, track: 'audio' | 'video') => post<{ ok: true; muted: number }>(`${R}/${id}/mute`, { userId, track })
export const removeParticipant = (id: string, userId: number) => post<{ ok: true }>(`${R}/${id}/remove`, { userId })

export const fetchCalls = () => apiFetch<CallList>(CALLS_PATH)
/** اتصال برقم تحويلة أو بحساب بالاسم: بيرن عند الطرف التاني */
export const dialCall = (target: CallTarget) => post<{ id: string; person: CallPerson; ringSeconds: number }>(CALLS_PATH, target)
export const fetchCall = (id: string) => apiFetch<CallEntry>(`${CALLS_PATH}/${id}`)
export const acceptCall = (id: string) => post<{ ok: true }>(`${CALLS_PATH}/${id}/accept`)
export const rejectCall = (id: string) => post<{ ok: true }>(`${CALLS_PATH}/${id}/reject`)
/** قفل المكالمة (أو إلغاؤها قبل الرد): بتنتهي للطرفين */
export const hangupCall = (id: string) => post<{ ok: true }>(`${CALLS_PATH}/${id}/hangup`)
export const fetchCallToken = (id: string) => post<{ token: string; url: string }>(`${CALLS_PATH}/${id}/token`)
/** «تحويلة 1001»، أو المسمى الوظيفي للي مالوش تحويلة */
export const callPersonLine = (person: CallPerson): string => (person.extension ? `تحويلة ${person.extension}` : person.jobTitle ?? '')

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
}

/** لون ثابت لكل شخص (للدايرة اللي فيها أول حروف اسمه) */
export function hueOf(id: string | number): number {
  const text = String(id)
  let hue = 0
  for (let index = 0; index < text.length; index++) hue = (hue * 31 + text.charCodeAt(index)) % 360
  return hue
}
