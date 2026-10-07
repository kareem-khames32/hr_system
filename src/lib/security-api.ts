// B2.17: أمان الحساب — «جلساتي» (الجلسات المفتوحة وإنهاؤها). صاحب الحساب لنفسه بس؛ الخادم بيحكم.
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'

export interface ActiveSession {
  id: number
  /** الجلسة اللي الصفحة دي مفتوحة بيها */
  current: boolean
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  ip: string | null
  /** اسم مفهوم للجهاز: «Chrome على Windows» */
  device: string
}
export interface MySessions { available: boolean; message: string | null; items: ActiveSession[] }

export const fetchMySessions = () => apiFetch<MySessions>('/auth/sessions')
export const endMySession = (id: number) => apiFetch<{ ended: true; current: boolean }>(`/auth/sessions/${id}`, { method: 'DELETE' })
export const endOtherSessions = () => apiFetch<{ ended: number }>('/auth/sessions/end-others', { method: 'POST' })
