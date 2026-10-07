// B2.17: أمان الحساب — «جلساتي» (الجلسات المفتوحة وإنهاؤها). صاحب الحساب لنفسه بس؛ الخادم بيحكم.
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch, type LoginResponse } from './api'

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

// B2.17-ج: التحقق بتطبيق مصادقة (TOTP)
export interface TotpStatus { available: boolean; message: string | null; enabled: boolean; pending: boolean; required: boolean }
/** السر (مجموعات) ورابط التطبيق — بيرجعوا من «ابدأ التفعيل» مرة واحدة */
export interface TotpSetupSecret { secret: string; otpauthUrl: string }
export const fetchTotpStatus = () => apiFetch<TotpStatus>('/auth/totp')
export const beginTotpSetup = () => apiFetch<TotpSetupSecret>('/auth/totp/setup', { method: 'POST' })
/** تأكيد التفعيل برمز من التطبيق — الرد جلسة جديدة (بيانات الحساب ورمز CSRF) */
export const confirmTotpSetup = (code: string, remember = false) =>
  apiFetch<LoginResponse>('/auth/totp/confirm', { method: 'POST', body: JSON.stringify({ code, remember }) })
export const disableTotp = (code: string) => apiFetch<{ enabled: false }>('/auth/totp/disable', { method: 'POST', body: JSON.stringify({ code }) })
