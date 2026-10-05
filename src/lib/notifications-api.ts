// B2.4: تفضيلات إشعارات المستخدم، وقوالب الإشعارات وسجل الإرسال (لحساب الشركة بصلاحية «إدارة الإعدادات»).
// قايمة الإشعارات نفسها (fetchNotifications وتعليم المقروء والحذف) في api.ts زي ما هي.
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'

export type NotificationMode = 'ON' | 'OFF' | 'DIGEST'
export type NotificationChannel = 'IN_APP' | 'EMAIL'

export const EMAIL_MODE_LABELS: Record<NotificationMode, string> = {
  ON: 'فورًا',
  DIGEST: 'ملخص يومي',
  OFF: 'مقفول',
}

export interface ApiNotificationPreferences {
  /** false = ترحيل 087 لسه ماتطبقش */
  available: boolean
  /** بريد الإشعارات مفتوح من «سياسات النظام»؟ */
  emailEnabled: boolean
  categories: Array<{
    key: string
    label: string
    /** null = الفئة دي بتظهر داخل النظام دايمًا (عدّاد محسوب) ومالهاش اختيار */
    inApp: NotificationMode | null
    email: NotificationMode
  }>
}

export const fetchNotificationPreferences = () => apiFetch<ApiNotificationPreferences>('/notifications/preferences')

export const setNotificationPreference = (category: string, channel: NotificationChannel, mode: NotificationMode) =>
  apiFetch<ApiNotificationPreferences>('/notifications/preferences', { method: 'PATCH', body: JSON.stringify({ category, channel, mode }) })

export interface ApiNotificationText { title: string; body: string }
export interface ApiNotificationTemplate extends ApiNotificationText { customized: boolean; default: ApiNotificationText }
export interface ApiNotificationEvent {
  code: string
  label: string
  category: string
  variables: Array<{ key: string; label: string; sample: string }>
  /** false = الحدث مالوش عنصر في قايمة الإشعارات: نص «داخل النظام» بتاعه هو السطر المختصر في الملخص اليومي */
  storedInApp: boolean
  templates: Record<NotificationChannel, ApiNotificationTemplate>
}
export interface ApiNotificationTemplates {
  available: boolean
  channels: Record<NotificationChannel, string>
  events: ApiNotificationEvent[]
}

export const fetchNotificationTemplates = () => apiFetch<ApiNotificationTemplates>('/notifications/templates')

const templatePath = (code: string, channel: NotificationChannel) => `/notifications/templates/${encodeURIComponent(code)}/${encodeURIComponent(channel)}`

export const saveNotificationTemplate = (code: string, channel: NotificationChannel, text: ApiNotificationText) =>
  apiFetch<ApiNotificationTemplates>(templatePath(code, channel), { method: 'PUT', body: JSON.stringify(text) })

export const resetNotificationTemplate = (code: string, channel: NotificationChannel) =>
  apiFetch<ApiNotificationTemplates>(templatePath(code, channel), { method: 'DELETE' })

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED' | 'DIGEST'

export const DELIVERY_STATUS_LABELS: Record<NotificationDeliveryStatus, string> = {
  PENDING: 'مستنية',
  SENT: 'اتبعتت',
  FAILED: 'فشلت',
  SKIPPED: 'اتخطّت',
  DIGEST: 'في الملخص اليومي',
}

export interface ApiNotificationDelivery {
  id: string
  channel: NotificationChannel
  status: NotificationDeliveryStatus
  attempts: number
  /** العنوان متخفي (ka***@example.com) */
  address: string | null
  detail: string | null
  createdAt: string
  sentAt: string | null
  event: string
  /** null = المستلم مخفي (إشعار طلب سري) */
  recipientUserId: number | null
  recipientName: string | null
}

export interface ApiNotificationDeliveries {
  available: boolean
  emailEnabled: boolean
  mailConfigured: boolean
  /** عنوان الواجهة (FRONTEND_URL) مضبوط على الخادم: من غيره لينك الرسالة مش هيشتغل فالرسائل بتتخطّى */
  linkConfigured: boolean
  /** عدد رسائل البريد في آخر 30 يوم بكل حالة */
  counts: Partial<Record<NotificationDeliveryStatus, number>>
  rows: ApiNotificationDelivery[]
}

export const fetchNotificationDeliveries = (status?: NotificationDeliveryStatus | '') =>
  apiFetch<ApiNotificationDeliveries>(`/notifications/deliveries${status ? `?status=${encodeURIComponent(status)}` : ''}`)
